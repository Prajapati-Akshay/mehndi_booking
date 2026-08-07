import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({ data: dto });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    return this.prisma.testimonial.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testimonial not found');
    await this.prisma.testimonial.delete({ where: { id } });
    return { id };
  }
}
