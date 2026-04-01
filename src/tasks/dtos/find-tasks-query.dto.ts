import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Frequency } from 'generated/prisma/enums';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export enum TaskStatusFilter {
  DUE = 'due',
  COMPLETED = 'completed',
  ALL = 'all',
}

export class FindTasksQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Frequency)
  @ApiPropertyOptional({
    enum: Frequency,
    enumName: 'Frequency',
    example: 'DAILY',
  })
  frequency?: Frequency;

  @IsOptional()
  @IsEnum(TaskStatusFilter)
  @ApiPropertyOptional({
    enum: TaskStatusFilter,
    enumName: 'TaskStatusFilter',
    example: TaskStatusFilter.ALL,
  })
  status?: TaskStatusFilter;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'gym',
    description: 'Search by title or category',
  })
  q?: string;
}
