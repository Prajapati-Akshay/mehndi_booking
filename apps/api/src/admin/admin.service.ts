import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const [totalBookings, pending, confirmed, completed, cancelled, rejected] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
      this.prisma.booking.count({ where: { status: 'REJECTED' } }),
    ]);

    const revenueAgg = await this.prisma.booking.aggregate({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      _sum: { totalAmount: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingAppointments = await this.prisma.booking.findMany({
      where: {
        appointmentDate: { gte: today },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      orderBy: { appointmentDate: 'asc' },
      take: 10,
      include: {
        customer: true,
        pricing: true,
        service: { include: { category: true } },
      },
    });

    const recentBookings = await this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: true,
        pricing: true,
        service: { include: { category: true } },
      },
    });

    return {
      totals: { totalBookings, pending, confirmed, completed, cancelled, rejected },
      revenue: revenueAgg._sum.totalAmount ?? 0,
      upcomingAppointments,
      recentBookings,
    };
  }
}
