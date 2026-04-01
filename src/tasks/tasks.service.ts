import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Frequency } from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { ResponseCreateTaskDto } from './dtos/response-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { CompleteTaskDto } from './dtos/complete-task.dto';
import {
  FindTasksQueryDto,
  TaskStatusFilter,
} from './dtos/find-tasks-query.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private getPeriodStart(
    frequency: Frequency,
    referenceDate = new Date(),
  ): Date {
    const periodStart = new Date(referenceDate);

    if (frequency === Frequency.DAILY) {
      periodStart.setHours(0, 0, 0, 0);
      return periodStart;
    }

    if (frequency === Frequency.WEEKLY) {
      const dayOfWeek = periodStart.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      periodStart.setDate(periodStart.getDate() + diffToMonday);
      periodStart.setHours(0, 0, 0, 0);
      return periodStart;
    }

    if (frequency === Frequency.MONTHLY) {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      return periodStart;
    }

    periodStart.setMonth(0, 1);
    periodStart.setHours(0, 0, 0, 0);
    return periodStart;
  }

  private getPeriodTaskCondition(
    frequency: Frequency,
    status: TaskStatusFilter,
    referenceDate: Date,
  ): Prisma.TaskWhereInput {
    const periodStart = this.getPeriodStart(frequency, referenceDate);

    if (status === TaskStatusFilter.DUE) {
      return {
        frequency,
        completions: {
          none: {
            completedAt: {
              gte: periodStart,
            },
          },
        },
      };
    }

    return {
      frequency,
      completions: {
        some: {
          completedAt: {
            gte: periodStart,
          },
        },
      },
    };
  }

  private getFilteredTasksWhere(
    userId: string,
    findTasksQueryDto: Partial<FindTasksQueryDto>,
    referenceDate = new Date(),
  ): Prisma.TaskWhereInput {
    const status = findTasksQueryDto.status ?? TaskStatusFilter.ALL;
    const queryText = findTasksQueryDto.q?.trim();
    const frequencies = findTasksQueryDto.frequency
      ? [findTasksQueryDto.frequency]
      : [
          Frequency.DAILY,
          Frequency.WEEKLY,
          Frequency.MONTHLY,
          Frequency.YEARLY,
        ];

    const filters: Prisma.TaskWhereInput[] = [
      {
        userId,
      },
      {
        createdAt: {
          lte: referenceDate,
        },
      },
    ];

    if (status === TaskStatusFilter.ALL && findTasksQueryDto.frequency) {
      filters.push({
        frequency: findTasksQueryDto.frequency,
      });
    }

    if (status !== TaskStatusFilter.ALL) {
      filters.push({
        OR: frequencies.map((frequency) =>
          this.getPeriodTaskCondition(frequency, status, referenceDate),
        ),
      });
    }

    if (queryText) {
      filters.push({
        OR: [
          { title: { contains: queryText, mode: 'insensitive' } },
          { category: { contains: queryText, mode: 'insensitive' } },
        ],
      });
    }

    return {
      AND: filters,
    };
  }

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

      const taskExists = await this.prisma.task.findFirst({
        where: {
          title: createTaskDto.title,
          userId: user.id,
        },
      });

      if (taskExists) {
        throw new HttpException(
          'Task with the same title already exists',
          HttpStatus.CONFLICT,
        );
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

  async findDue(
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
        where: this.getFilteredTasksWhere(
          user.id,
          {
            status: TaskStatusFilter.DUE,
          },
          new Date(),
        ),
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
      });

      return tasks;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to find tasks', HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(
    findTasksQueryDto?: Partial<FindTasksQueryDto>,
    tokenPayload?: { sub: string },
  ): Promise<ResponseCreateTaskDto[]> {
    try {
      if (!tokenPayload) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const limit = findTasksQueryDto?.limit ?? 10;
      const offset = findTasksQueryDto?.offset ?? 0;

      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const tasks = await this.prisma.task.findMany({
        where: this.getFilteredTasksWhere(user.id, findTasksQueryDto ?? {}),
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
      });

      return tasks;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to find tasks', HttpStatus.BAD_REQUEST);
    }
  }

  async complete(
    completeTaskDto: CompleteTaskDto,
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
          id: completeTaskDto.id,
          userId: user.id,
        },
      });

      if (!task) {
        throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
      }

      const periodStart = this.getPeriodStart(task.frequency);
      const completionInCurrentPeriod =
        await this.prisma.taskCompletion.findFirst({
          where: {
            taskId: task.id,
            completedAt: {
              gte: periodStart,
            },
          },
        });

      if (completionInCurrentPeriod) {
        throw new HttpException(
          'Task already completed in the current period',
          HttpStatus.CONFLICT,
        );
      }

      await this.prisma.taskCompletion.create({
        data: {
          taskId: task.id,
        },
      });

      return task;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to complete task',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
