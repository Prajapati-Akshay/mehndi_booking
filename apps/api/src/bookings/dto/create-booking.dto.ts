import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEmail, IsInt, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  serviceId: string;

  @ApiProperty()
  @IsUUID()
  pricingId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  timeSlotId?: string;

  @ApiProperty({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  numberOfPeople: number;

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  appointmentTime: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty()
  @Matches(/^[+]?[0-9]{10,15}$/, { message: 'Phone number must be 10-15 digits, optionally starting with +' })
  phoneNumber: string;

  @ApiProperty()
  @Matches(/^[+]?[0-9]{10,15}$/, { message: 'WhatsApp number must be 10-15 digits, optionally starting with +' })
  whatsappNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsBoolean()
  termsAccepted: boolean;
}
