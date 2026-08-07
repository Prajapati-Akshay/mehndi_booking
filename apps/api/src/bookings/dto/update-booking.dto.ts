import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBookingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  appointmentTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfPeople?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
