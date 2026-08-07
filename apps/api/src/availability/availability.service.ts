import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async findAll(from?: string, to?: string) {
    return this.prisma.availability.findMany({
      where: {
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: startOfDay(from) } : {}),
                ...(to ? { lte: startOfDay(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'asc' },
      include: { timeSlots: true },
    });
  }

  async create(dto: CreateAvailabilityDto) {
    const date = startOfDay(dto.date);
    if (date < startOfDay(new Date().toISOString())) {
      throw new BadRequestException('Cannot create availability for a past date');
    }

    const availability = await this.prisma.availability.upsert({
      where: { date },
      update: { isAvailable: dto.isAvailable ?? true, note: dto.note },
      create: { date, isAvailable: dto.isAvailable ?? true, note: dto.note },
    });

    if (dto.timeSlots?.length) {
      for (const slot of dto.timeSlots) {
        const [startTime, endTime] = slot.split('-');
        if (!startTime || !endTime) continue;
        const existing = await this.prisma.timeSlot.findFirst({
          where: { availabilityId: availability.id, startTime },
        });
        if (!existing) {
          await this.prisma.timeSlot.create({
            data: { availabilityId: availability.id, startTime, endTime },
          });
        }
      }
    }

    return this.prisma.availability.findUnique({ where: { id: availability.id }, include: { timeSlots: true } });
  }

  async update(id: string, dto: UpdateAvailabilityDto) {
    const existing = await this.prisma.availability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Availability not found');
    return this.prisma.availability.update({
      where: { id },
      data: {
        isAvailable: dto.isAvailable,
        note: dto.note,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.availability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Availability not found');
    await this.prisma.availability.delete({ where: { id } });
    return { id };
  }
}
