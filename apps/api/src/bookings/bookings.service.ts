import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { calculateBookingAmounts } from './booking-pricing.util';

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateBookingNumber(): string {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `MBD-${stamp}${random}`;
}

const BOOKING_INCLUDE = {
  customer: true,
  service: { include: { category: true } },
  pricing: true,
  timeSlot: true,
} as const;

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async create(dto: CreateBookingDto) {
    if (!dto.termsAccepted) {
      throw new BadRequestException('You must accept the booking terms and conditions');
    }
    if (dto.numberOfPeople < 1) {
      throw new BadRequestException('Number of people must be at least 1');
    }

    const appointmentDate = startOfDay(dto.appointmentDate);
    const today = startOfDay(new Date().toISOString());
    if (appointmentDate < today) {
      throw new BadRequestException('Appointment date cannot be in the past');
    }

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.isActive) {
      throw new BadRequestException('Selected service is not available');
    }

    const pricing = await this.prisma.servicePricing.findUnique({ where: { id: dto.pricingId } });
    if (!pricing || !pricing.isActive) {
      throw new BadRequestException('Selected package is not available');
    }
    if (pricing.serviceId !== service.id) {
      throw new BadRequestException('Selected package does not belong to the selected service');
    }

    if (dto.timeSlotId) {
      const slot = await this.prisma.timeSlot.findUnique({
        where: { id: dto.timeSlotId },
        include: { availability: true },
      });
      if (!slot) throw new BadRequestException('Selected time slot does not exist');
      if (!slot.availability.isAvailable) {
        throw new BadRequestException('Selected date is not available for booking');
      }
      if (slot.availability.date.getTime() !== appointmentDate.getTime()) {
        throw new BadRequestException('Time slot does not match the selected date');
      }
      if (slot.isBooked) {
        throw new ConflictException('This appointment slot is no longer available. Please select another time.');
      }
    } else {
      // No specific time slot linked: still guard against two bookings landing on the
      // exact same date + time for this pricing tier (best-effort conflict check).
      const conflicting = await this.prisma.booking.findFirst({
        where: {
          appointmentDate,
          appointmentTime: dto.appointmentTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });
      if (conflicting) {
        throw new ConflictException('This appointment slot is no longer available. Please select another time.');
      }
    }

    const amounts = calculateBookingAmounts(pricing.price, dto.numberOfPeople);

    const booking = await this.prisma.$transaction(async (tx) => {
      if (dto.timeSlotId) {
        const slot = await tx.timeSlot.findUnique({ where: { id: dto.timeSlotId } });
        if (!slot || slot.isBooked) {
          throw new ConflictException('This appointment slot is no longer available. Please select another time.');
        }
        await tx.timeSlot.update({ where: { id: dto.timeSlotId }, data: { isBooked: true } });
      }

      const customer = await tx.customer.upsert({
        where: { phone: dto.phoneNumber },
        update: {
          fullName: dto.fullName,
          whatsappNumber: dto.whatsappNumber,
          email: dto.email,
          address: dto.address,
        },
        create: {
          fullName: dto.fullName,
          phone: dto.phoneNumber,
          whatsappNumber: dto.whatsappNumber,
          email: dto.email,
          address: dto.address,
        },
      });

      const created = await tx.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          customerId: customer.id,
          serviceId: service.id,
          pricingId: pricing.id,
          timeSlotId: dto.timeSlotId,
          appointmentDate,
          appointmentTime: dto.appointmentTime,
          eventType: dto.eventType,
          numberOfPeople: dto.numberOfPeople,
          notes: dto.notes,
          pricePerPerson: amounts.pricePerPerson,
          totalAmount: amounts.totalAmount,
          advanceAmount: amounts.advanceAmount,
          remainingAmount: amounts.remainingAmount,
          status: 'PENDING',
          termsAccepted: dto.termsAccepted,
          statusHistory: { create: { status: 'PENDING', note: 'Booking submitted by customer' } },
          payments: {
            create: {
              amount: amounts.advanceAmount,
              totalAmount: amounts.totalAmount,
              advanceAmount: amounts.advanceAmount,
              remainingAmount: amounts.remainingAmount,
              status: 'PENDING',
            },
          },
        },
        include: BOOKING_INCLUDE,
      });

      return created;
    });

    // Notification dispatch happens after the transaction has committed and never
    // throws — an SMS failure must not affect the already-successful booking.
    await this.notifications.notifyBookingCreated({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      appointmentDate: booking.appointmentDate.toISOString(),
      appointmentTime: booking.appointmentTime,
      totalAmount: booking.totalAmount,
      advanceAmount: booking.advanceAmount,
      customer: { fullName: booking.customer.fullName, phone: booking.customer.phone },
    });

    return booking;
  }

  async findAll(status?: string) {
    return this.prisma.booking.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: BOOKING_INCLUDE,
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { OR: [{ id }, { bookingNumber: id }] },
      include: { ...BOOKING_INCLUDE, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...dto,
        appointmentDate: dto.appointmentDate ? startOfDay(dto.appointmentDate) : undefined,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!booking) throw new NotFoundException('Booking not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      if ((dto.status === 'CANCELLED' || dto.status === 'REJECTED') && booking.timeSlotId) {
        await tx.timeSlot.update({ where: { id: booking.timeSlotId }, data: { isBooked: false } });
      }

      const paymentStatus =
        dto.status === 'COMPLETED' ? 'PAID' : dto.status === 'CONFIRMED' ? 'PARTIAL' : undefined;
      if (paymentStatus) {
        await tx.payment.updateMany({ where: { bookingId: id }, data: { status: paymentStatus } });
      }

      return tx.booking.update({
        where: { id },
        data: {
          status: dto.status,
          statusHistory: { create: { status: dto.status, note: dto.note } },
        },
        include: BOOKING_INCLUDE,
      });
    });

    const notifyContext = {
      id: updated.id,
      bookingNumber: updated.bookingNumber,
      appointmentDate: updated.appointmentDate.toISOString(),
      appointmentTime: updated.appointmentTime,
      totalAmount: updated.totalAmount,
      advanceAmount: updated.advanceAmount,
      customer: { fullName: updated.customer.fullName, phone: updated.customer.phone },
    };

    if (dto.status === 'CONFIRMED') await this.notifications.notifyBookingConfirmed(notifyContext);
    if (dto.status === 'REJECTED') await this.notifications.notifyBookingRejected(notifyContext);
    if (dto.status === 'CANCELLED') await this.notifications.notifyBookingCancelled(notifyContext);
    if (dto.status === 'COMPLETED') await this.notifications.notifyBookingCompleted(notifyContext);

    return updated;
  }

  async remove(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.timeSlotId) {
      await this.prisma.timeSlot.update({ where: { id: booking.timeSlotId }, data: { isBooked: false } });
    }
    await this.prisma.booking.delete({ where: { id } });
    return { id };
  }
}
