import { Frequency } from 'generated/prisma/enums';

export class ResponseCreateTaskDto {
  title: string;
  category: string | null;
  frequency: Frequency;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
