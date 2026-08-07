import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAvailabilityDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  date: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, type: [String], example: ['10:00-11:00', '11:30-12:30'] })
  @IsOptional()
  @IsArray()
  timeSlots?: string[];
}
