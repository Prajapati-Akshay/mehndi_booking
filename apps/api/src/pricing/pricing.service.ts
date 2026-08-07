import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.servicePricing.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { service: { include: { category: true } } },
    });
  }

  async findOne(id: string) {
    const pricing = await this.prisma.servicePricing.findUnique({
      where: { id },
      include: { service: { include: { category: true } } },
    });
    if (!pricing) throw new NotFoundException('Pricing tier not found');
    return pricing;
  }

  async create(dto: CreatePricingDto) {
    return this.prisma.servicePricing.create({ data: dto });
  }

  async update(id: string, dto: UpdatePricingDto) {
    await this.findOne(id);
    return this.prisma.servicePricing.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.servicePricing.delete({ where: { id } });
    return { id };
  }
}
