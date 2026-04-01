import { IsNotEmpty } from 'class-validator';

export class CompleteTaskDto {
  @IsNotEmpty()
  id: string;
}
