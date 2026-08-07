import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  bookingId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'], required: false })
  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
