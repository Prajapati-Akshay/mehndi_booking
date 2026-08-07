import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(bookingId?: string) {
    return this.prisma.payment.findMany({
      where: bookingId ? { bookingId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreatePaymentDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: dto.amount,
        status: dto.status ?? 'PARTIAL',
        method: dto.method,
        reference: dto.reference,
      },
    });

    return payment;
  }

  async updateStatus(id: string, status: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({ where: { id }, data: { status } });
  }
}
