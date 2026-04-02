import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from 'src/tasks/tasks.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(() => {
    execSync('npx prisma migrate deploy');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        TasksModule,
        UsersModule,
        AuthModule,
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', '..', 'files'),
          serveRoot: '/files',
        }),
      ],
    }).compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    prismaService = module.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prismaService.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  const userPayload = {
    fullName: 'Task User',
    email: 'task@example.com',
    password: 'Strong@123!',
  };

  async function createUserAndSignIn(
    payload = userPayload,
  ): Promise<{ id: string; token: string }> {
    await request(app.getHttpServer()).post('/users').send(payload);

    const signInRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: payload.email, password: payload.password });

    return {
      id: signInRes.body.id as string,
      token: signInRes.body.token as string,
    };
  }

  async function createTask(
    token: string,
    title = 'Morning run',
  ): Promise<{ id: string; title: string }> {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, category: 'fitness' });

    return res.body as { id: string; title: string };
  }

  describe('POST /tasks', () => {
    it('should create a task and return 201', async () => {
      const { token } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Morning run', category: 'fitness' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        title: 'Morning run',
        category: 'fitness',
      });
    });

    it('should return 400 when title is missing', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'fitness' })
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Morning run' })
        .expect(401);
    });

    it('should return 409 when a task with the same title already exists', async () => {
      const { token } = await createUserAndSignIn();

      await createTask(token, 'Morning run');

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Morning run' })
        .expect(409);
    });
  });

  describe('GET /tasks/due', () => {
    it('should return due tasks', async () => {
      const { token } = await createUserAndSignIn();
      await createTask(token, 'Due task');

      const res = await request(app.getHttpServer())
        .get('/tasks/due')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when no tasks exist', async () => {
      const { token } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .get('/tasks/due')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/tasks/due').expect(401);
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks', async () => {
      const { token } = await createUserAndSignIn();
      await createTask(token, 'Task 1');
      await createTask(token, 'Task 2');

      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
    });

    it('should filter tasks by search query', async () => {
      const { token } = await createUserAndSignIn();
      await createTask(token, 'Morning run');
      await createTask(token, 'Evening yoga');

      const res = await request(app.getHttpServer())
        .get('/tasks?q=morning')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Morning run');
    });

    it('should respect pagination limit and offset', async () => {
      const { token } = await createUserAndSignIn();
      await createTask(token, 'Task 1');
      await createTask(token, 'Task 2');
      await createTask(token, 'Task 3');

      const res = await request(app.getHttpServer())
        .get('/tasks?limit=2&offset=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/tasks').expect(401);
    });
  });

  describe('GET /tasks/:taskId', () => {
    it('should return one task by id', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Morning run');

      const res = await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(task.id);
      expect(res.body.title).toBe('Morning run');
    });

    it('should return 404 for a non-existent task', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .get('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 401 when no token is provided', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task');

      await request(app.getHttpServer()).get(`/tasks/${task.id}`).expect(401);
    });
  });

  describe('PATCH /tasks/:taskId', () => {
    it('should update task title', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Old Title');

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' })
        .expect(200);

      expect(res.body.title).toBe('New Title');
    });

    it('should return 401 when no token is provided', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task');

      await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should return 404 for a non-existent task', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .patch('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /tasks/:taskId', () => {
    it('should delete task and return success message', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task to delete');

      const res = await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Task deleted successfully');
    });

    it('should return 401 when no token is provided', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task');

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .expect(401);
    });

    it('should return 404 for a non-existent task', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .delete('/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('POST /tasks/complete', () => {
    it('should complete a task and return the task', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task to complete');

      const res = await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: task.id })
        .expect(201);

      expect(res.body.id).toBe(task.id);
    });

    it('should return 409 when task is already completed in the current period', async () => {
      const { token } = await createUserAndSignIn();
      const task = await createTask(token, 'Task to complete');

      await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: task.id })
        .expect(201);

      await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: task.id })
        .expect(409);
    });

    it('should return 404 for a non-existent task', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/tasks/complete')
        .send({ id: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });

    it('should update streak to 1 when user completes all due tasks', async () => {
      const { id: userId, token } = await createUserAndSignIn();
      const task = await createTask(token, 'Only task');

      await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: task.id })
        .expect(201);

      const streakRes = await request(app.getHttpServer())
        .get(`/users/streak/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(streakRes.body.streak).toBe(1);
      expect(streakRes.body.lastStreakAt).not.toBeNull();
    });

    it('should not update streak when there are still due tasks', async () => {
      const { id: userId, token } = await createUserAndSignIn();
      await createTask(token, 'Task A');
      const taskB = await createTask(token, 'Task B');

      await request(app.getHttpServer())
        .post('/tasks/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: taskB.id })
        .expect(201);

      const streakRes = await request(app.getHttpServer())
        .get(`/users/streak/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(streakRes.body.streak).toBe(0);
    });
  });
});
