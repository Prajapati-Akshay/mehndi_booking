import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // Bootstrap-only: registration is allowed solely when no admin account exists yet,
  // preventing anonymous creation of further admin accounts once the site is live.
  async register(dto: RegisterDto) {
    const existingAdminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (existingAdminCount > 0) {
      throw new ConflictException('Admin account already exists. Contact an existing admin to add users.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, role: 'ADMIN' },
    });

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
