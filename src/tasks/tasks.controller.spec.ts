import { TasksController } from './tasks.controller';
import { Frequency } from 'generated/prisma/enums';
import { PayloadTokenDto } from 'src/auth/dtos/payload-token.dto';
import { TaskStatusFilter } from './dtos/find-tasks-query.dto';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: {
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    findOne: jest.Mock;
    findDue: jest.Mock;
    findAll: jest.Mock;
    complete: jest.Mock;
  };

  const tokenPayload: PayloadTokenDto = {
    sub: 'user-1',
    email: 'user@example.com',
    iat: 1711886400,
    exp: 1711890000,
    aud: 'tasks-app',
    iss: 'tasks-api',
  };

  beforeEach(() => {
    tasksService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findDue: jest.fn(),
      findAll: jest.fn(),
      complete: jest.fn(),
    };

    controller = new TasksController(tasksService as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate createTask to service', async () => {
    const dto = { title: 'Task', category: 'work', frequency: Frequency.DAILY };
    const expected = { id: 'task-1', ...dto, userId: tokenPayload.sub };
    tasksService.create.mockResolvedValue(expected);

    const result = await controller.createTask(dto, tokenPayload);

    expect(tasksService.create).toHaveBeenCalledWith(dto, tokenPayload);
    expect(result).toEqual(expected);
  });

  it('should delegate updateTask to service', async () => {
    const dto = { title: 'Updated title' };
    const expected = { id: 'task-1', title: 'Updated title' };
    tasksService.update.mockResolvedValue(expected);

    const result = await controller.updateTask('task-1', dto, tokenPayload);

    expect(tasksService.update).toHaveBeenCalledWith(
      'task-1',
      dto,
      tokenPayload,
    );
    expect(result).toEqual(expected);
  });

  it('should delegate deleteTask to service', async () => {
    const expected = { message: 'Task deleted successfully' };
    tasksService.delete.mockResolvedValue(expected);

    const result = await controller.deleteTask('task-1', tokenPayload);

    expect(tasksService.delete).toHaveBeenCalledWith('task-1', tokenPayload);
    expect(result).toEqual(expected);
  });

  it('should delegate findOneTask to service', async () => {
    const expected = {
      id: 'task-1',
      title: 'Task',
      category: null,
      frequency: Frequency.DAILY,
      userId: tokenPayload.sub,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    };
    tasksService.findOne.mockResolvedValue(expected);

    const result = await controller.findOneTask('task-1', tokenPayload);

    expect(tasksService.findOne).toHaveBeenCalledWith('task-1', tokenPayload);
    expect(result).toEqual(expected);
  });

  it('should delegate findDueTasks to service', async () => {
    const paginationDto = { limit: 10, offset: 0 };
    const expected = [{ id: 'task-1', title: 'Task' }];
    tasksService.findDue.mockResolvedValue(expected);

    const result = await controller.findDueTasks(paginationDto, tokenPayload);

    expect(tasksService.findDue).toHaveBeenCalledWith(
      paginationDto,
      tokenPayload,
    );
    expect(result).toEqual(expected);
  });

  it('should delegate findAllTasks to service', async () => {
    const queryDto = {
      limit: 10,
      offset: 0,
      frequency: Frequency.DAILY,
      status: TaskStatusFilter.DUE,
      q: 'gym',
    };
    const expected = [{ id: 'task-1', title: 'Task' }];
    tasksService.findAll.mockResolvedValue(expected);

    const result = await controller.findAllTasks(queryDto, tokenPayload);

    expect(tasksService.findAll).toHaveBeenCalledWith(queryDto, tokenPayload);
    expect(result).toEqual(expected);
  });

  it('should delegate completeTask to service', async () => {
    const dto = { id: 'task-1' };
    const expected = {
      id: 'task-1',
      title: 'Task',
      category: null,
      frequency: Frequency.DAILY,
      userId: tokenPayload.sub,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    };
    tasksService.complete.mockResolvedValue(expected);

    const result = await controller.completeTask(dto, tokenPayload);

    expect(tasksService.complete).toHaveBeenCalledWith(dto, tokenPayload);
    expect(result).toEqual(expected);
  });
});
