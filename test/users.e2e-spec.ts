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

describe('Users (e2e)', () => {
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
    fullName: 'John Doe',
    email: 'john@example.com',
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

  describe('POST /users', () => {
    it('should create a user and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send(userPayload)
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        fullName: 'John Doe',
        email: 'john@example.com',
      });
      expect(res.body.password).toBeUndefined();
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ email: 'missing@fields.com' })
        .expect(400);
    });

    it('should return 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          fullName: 'John',
          email: 'not-an-email',
          password: 'Strong@123!',
        })
        .expect(400);
    });

    it('should return 400 when password is too weak', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ fullName: 'John', email: 'john@example.com', password: 'weak' })
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const { id } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .get(`/users/${id}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id,
        fullName: 'John Doe',
        email: 'john@example.com',
      });
      expect(res.body.password).toBeUndefined();
    });

    it('should return 404 when user does not exist', async () => {
      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user fullName', async () => {
      const { id, token } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Jane Doe' })
        .expect(200);

      expect(res.body.fullName).toBe('Jane Doe');
    });

    it('should return 401 when no token is provided', async () => {
      const { id } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .patch(`/users/${id}`)
        .send({ fullName: 'Jane Doe' })
        .expect(401);
    });

    it('should return 401 when updating another user', async () => {
      const { token } = await createUserAndSignIn();
      const { id: otherId } = await createUserAndSignIn({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'Strong@123!',
      });

      await request(app.getHttpServer())
        .patch(`/users/${otherId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Hacked' })
        .expect(401);
    });

    it('should return 404 when user does not exist', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .patch('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Nobody' })
        .expect(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user and return success message', async () => {
      const { id, token } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('User deleted successfully');
    });

    it('should return 401 when no token is provided', async () => {
      const { id } = await createUserAndSignIn();

      await request(app.getHttpServer()).delete(`/users/${id}`).expect(401);
    });

    it('should return 401 when deleting another user', async () => {
      const { token } = await createUserAndSignIn();
      const { id: otherId } = await createUserAndSignIn({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'Strong@123!',
      });

      await request(app.getHttpServer())
        .delete(`/users/${otherId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should return 404 when user does not exist', async () => {
      const { token } = await createUserAndSignIn();

      await request(app.getHttpServer())
        .delete('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('GET /users/streak/:id', () => {
    it('should return streak 0 for a new user', async () => {
      const { id, token } = await createUserAndSignIn();

      const res = await request(app.getHttpServer())
        .get(`/users/streak/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        streak: 0,
        lastStreakAt: null,
      });
    });

    it('should return 401 when no token is provided', async () => {
      const { id } = await createUserAndSignIn();

      await request(app.getHttpServer()).get(`/users/streak/${id}`).expect(401);
    });

    it('should return 401 when accessing another user streak', async () => {
      const { token } = await createUserAndSignIn();
      const { id: otherId } = await createUserAndSignIn({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'Strong@123!',
      });

      await request(app.getHttpServer())
        .get(`/users/streak/${otherId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });
});
