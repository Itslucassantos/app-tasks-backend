import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Frequency } from 'generated/prisma/enums';
import { TasksService } from './tasks.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskStatusFilter } from './dtos/find-tasks-query.dto';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    task: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    taskCompletion: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  const tokenPayload = { sub: 'user-1' };
  const user = { id: 'user-1', streak: 0, lastStreakAt: null };
  const task = {
    id: 'task-1',
    title: 'Task',
    category: null,
    frequency: Frequency.DAILY,
    userId: 'user-1',
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: { findFirst: jest.fn(), update: jest.fn() },
      task: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      taskCompletion: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create task when user exists', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.create.mockResolvedValue(task);

    const result = await service.create(
      {
        title: 'Task',
        category: 'work',
        frequency: Frequency.DAILY,
      },
      tokenPayload,
    );

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: 'Task',
        category: 'work',
        frequency: Frequency.DAILY,
        userId: user.id,
      },
    });
    expect(result).toEqual(task);
  });

  it('should throw not found when creating task for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          title: 'Task',
          category: 'work',
          frequency: Frequency.DAILY,
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
  });

  it('should throw conflict when creating task with existing title', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);

    await expect(
      service.create(
        {
          title: 'Task',
          category: 'work',
          frequency: Frequency.DAILY,
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException(
        'Task with the same title already exists',
        HttpStatus.CONFLICT,
      ),
    );

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: {
        title: 'Task',
        userId: user.id,
      },
    });
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('should throw bad request when creating task fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(null);
    prisma.task.create.mockRejectedValue(new Error('db error'));

    await expect(
      service.create(
        {
          title: 'Task',
          category: 'work',
          frequency: Frequency.DAILY,
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException('Failed to create task', HttpStatus.BAD_REQUEST),
    );
  });

  it('should update task when user and task exist', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.update.mockResolvedValue({
      ...task,
      title: 'Updated task',
    });

    const result = await service.update(
      'task-1',
      {
        title: 'Updated task',
      },
      tokenPayload,
    );

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
      data: {
        title: 'Updated task',
      },
    });
    expect(result).toEqual({
      ...task,
      title: 'Updated task',
    });
  });

  it('should throw not found when updating task for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        'task-1',
        {
          title: 'Updated task',
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findFirst).not.toHaveBeenCalled();
  });

  it('should throw not found when updating a missing task', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        'task-1',
        {
          title: 'Updated task',
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException('Task not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('should throw bad request when updating task fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.update.mockRejectedValue(new Error('db error'));

    await expect(
      service.update(
        'task-1',
        {
          title: 'Updated task',
        },
        tokenPayload,
      ),
    ).rejects.toThrow(
      new HttpException('Failed to update task', HttpStatus.BAD_REQUEST),
    );
  });

  it('should return due tasks in findDue with pagination', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findMany.mockResolvedValue([task]);

    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-03-31T12:00:00.000Z').getTime());

    const result = await service.findDue({ limit: 5, offset: 2 }, tokenPayload);

    expect(result).toEqual([task]);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 5,
        orderBy: {
          createdAt: 'asc',
        },
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ userId: user.id }),
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ frequency: Frequency.DAILY }),
                expect.objectContaining({ frequency: Frequency.WEEKLY }),
                expect.objectContaining({ frequency: Frequency.MONTHLY }),
                expect.objectContaining({ frequency: Frequency.YEARLY }),
              ]),
            }),
          ]),
        }),
      }),
    );

    nowSpy.mockRestore();
  });

  it('should throw unauthorized in findDue without token', async () => {
    await expect(service.findDue({ limit: 10, offset: 0 })).rejects.toThrow(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('should throw not found in findDue when user is missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.findDue({ limit: 10, offset: 0 }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it('should throw bad request in findDue when query fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findMany.mockRejectedValue(new Error('db error'));

    await expect(
      service.findDue({ limit: 10, offset: 0 }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('Failed to find tasks', HttpStatus.BAD_REQUEST),
    );
  });

  it('should return all tasks in findAll with frequency, status and search query', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findMany.mockResolvedValue([task]);

    const result = await service.findAll(
      {
        limit: 10,
        offset: 0,
        frequency: Frequency.DAILY,
        status: TaskStatusFilter.DUE,
        q: 'gym',
      },
      tokenPayload,
    );

    expect(result).toEqual([task]);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        where: expect.objectContaining({
          AND: expect.any(Array),
        }),
      }),
    );
  });

  it('should throw unauthorized in findAll without token', async () => {
    await expect(
      service.findAll({ status: TaskStatusFilter.ALL }),
    ).rejects.toThrow(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
    );
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('should throw not found in findAll when user is missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.findAll({ status: TaskStatusFilter.ALL }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it('should throw bad request in findAll when query fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findMany.mockRejectedValue(new Error('db error'));

    await expect(
      service.findAll({ status: TaskStatusFilter.ALL }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('Failed to find tasks', HttpStatus.BAD_REQUEST),
    );
  });

  it('should delete task when user and task exist', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.delete.mockResolvedValue(task);

    const result = await service.delete('task-1', tokenPayload);

    expect(prisma.task.delete).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
      },
    });
    expect(result).toEqual({ message: 'Task deleted successfully' });
  });

  it('should throw not found when deleting task for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.delete('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findFirst).not.toHaveBeenCalled();
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });

  it('should throw not found when deleting a missing task', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.delete('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('Task not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });

  it('should throw bad request when deleting task fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.task.delete.mockRejectedValue(new Error('db error'));

    await expect(service.delete('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('Failed to delete task', HttpStatus.BAD_REQUEST),
    );
  });

  it('should return task in findOne when user and task exist', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);

    const result = await service.findOne('task-1', tokenPayload);

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'task-1',
        userId: user.id,
      },
    });
    expect(result).toEqual(task);
  });

  it('should throw not found in findOne when user is missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findFirst).not.toHaveBeenCalled();
  });

  it('should throw not found in findOne when task is missing', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.findOne('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('Task not found', HttpStatus.NOT_FOUND),
    );
  });

  it('should throw bad request in findOne when query fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockRejectedValue(new Error('db error'));

    await expect(service.findOne('task-1', tokenPayload)).rejects.toThrow(
      new HttpException('Failed to find task', HttpStatus.BAD_REQUEST),
    );
  });

  it('should complete task when not completed in current period', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.taskCompletion.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.user.update.mockResolvedValue({
      ...user,
      streak: 1,
      lastStreakAt: new Date('2026-03-31T00:00:00.000Z'),
    });
    prisma.taskCompletion.create.mockResolvedValue({
      id: 'completion-1',
      taskId: task.id,
      completedAt: new Date('2026-03-31T12:00:00.000Z'),
    });

    const result = await service.complete({ id: task.id }, tokenPayload);

    expect(prisma.taskCompletion.findFirst).toHaveBeenCalledWith({
      where: {
        taskId: task.id,
        completedAt: {
          gte: expect.any(Date),
        },
      },
    });
    expect(prisma.taskCompletion.create).toHaveBeenCalledWith({
      data: {
        taskId: task.id,
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: {
        id: user.id,
      },
      data: {
        streak: 1,
        lastStreakAt: expect.any(Date),
      },
    });
    expect(result).toEqual(task);
  });

  it('should not update streak when there are still due tasks', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.taskCompletion.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockResolvedValue([task]);
    prisma.taskCompletion.create.mockResolvedValue({
      id: 'completion-1',
      taskId: task.id,
      completedAt: new Date('2026-03-31T12:00:00.000Z'),
    });

    await service.complete({ id: task.id }, tokenPayload);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('should throw conflict when task already completed in current period', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.taskCompletion.findFirst.mockResolvedValue({
      id: 'completion-1',
      taskId: task.id,
      completedAt: new Date('2026-03-31T12:00:00.000Z'),
    });

    await expect(
      service.complete({ id: task.id }, tokenPayload),
    ).rejects.toThrow(
      new HttpException(
        'Task already completed in the current period',
        HttpStatus.CONFLICT,
      ),
    );
    expect(prisma.taskCompletion.create).not.toHaveBeenCalled();
  });

  it('should throw not found when completing task for missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.complete({ id: task.id }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('User not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.task.findFirst).not.toHaveBeenCalled();
  });

  it('should throw not found when completing a missing task', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.complete({ id: task.id }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('Task not found', HttpStatus.NOT_FOUND),
    );
    expect(prisma.taskCompletion.findFirst).not.toHaveBeenCalled();
  });

  it('should throw bad request when completing task fails unexpectedly', async () => {
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.task.findFirst.mockResolvedValue(task);
    prisma.taskCompletion.findFirst.mockResolvedValue(null);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.taskCompletion.create.mockRejectedValue(new Error('db error'));

    await expect(
      service.complete({ id: task.id }, tokenPayload),
    ).rejects.toThrow(
      new HttpException('Failed to complete task', HttpStatus.BAD_REQUEST),
    );
  });
});
