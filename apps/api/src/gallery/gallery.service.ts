import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.gallery.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async create(dto: CreateGalleryDto) {
    return this.prisma.gallery.create({ data: dto });
  }

  async update(id: string, dto: UpdateGalleryDto) {
    const existing = await this.prisma.gallery.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gallery item not found');
    return this.prisma.gallery.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.gallery.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gallery item not found');
    await this.prisma.gallery.delete({ where: { id } });
    return { id };
  }
}
