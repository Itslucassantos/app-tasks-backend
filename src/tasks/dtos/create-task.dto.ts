import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Frequency } from 'generated/prisma/enums';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(Frequency)
  @IsOptional()
  @ApiPropertyOptional({
    enum: Frequency,
    enumName: 'Frequency',
    example: 'DAILY, WEEKLY, MONTHLY or YEARLY',
  })
  frequency?: Frequency;
}
