import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { ResponseCreateTaskDto } from './dtos/response-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(
    createTaskDto: CreateTaskDto,
    tokenPayload: { sub: string },
  ): Promise<ResponseCreateTaskDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const task = await this.prisma.task.create({
        data: {
          title: createTaskDto.title,
          category: createTaskDto.category,
          frequency: createTaskDto.frequency,
          userId: user.id,
        },
      });

      return task;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to create task', HttpStatus.BAD_REQUEST);
    }
  }

  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    tokenPayload: { sub: string },
  ): Promise<ResponseCreateTaskDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const task = await this.prisma.task.findFirst({
        where: {
          id: taskId,
          userId: user.id,
        },
      });

      if (!task) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      const updatedTask = await this.prisma.task.update({
        where: {
          id: taskId,
        },
        data: updateTaskDto,
      });

      return updatedTask;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to update task', HttpStatus.BAD_REQUEST);
    }
  }

  async delete(
    taskId: string,
    tokenPayload: { sub: string },
  ): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const task = await this.prisma.task.findFirst({
        where: {
          id: taskId,
          userId: user.id,
        },
      });

      if (!task) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.task.delete({
        where: {
          id: taskId,
        },
      });

      return { message: 'Task deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to delete task', HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(
    taskId: string,
    tokenPayload: { sub: string },
  ): Promise<ResponseCreateTaskDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const task = await this.prisma.task.findFirst({
        where: {
          id: taskId,
          userId: user.id,
        },
      });

      if (!task) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      return task;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to find task', HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    tokenPayload?: { sub: string },
  ): Promise<ResponseCreateTaskDto[]> {
    try {
      if (!tokenPayload) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const limit = paginationDto?.limit ?? 10;
      const offset = paginationDto?.offset ?? 0;

      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const tasks = await this.prisma.task.findMany({
        where: {
          userId: user.id,
        },
        skip: offset,
        take: limit,
      });

      return tasks;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to find tasks', HttpStatus.BAD_REQUEST);
    }
  }
}
