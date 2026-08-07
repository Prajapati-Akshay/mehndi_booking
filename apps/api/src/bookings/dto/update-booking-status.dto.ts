import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BookingStatusValue {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatusValue })
  @IsEnum(BookingStatusValue)
  status: BookingStatusValue;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
