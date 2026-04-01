import { HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { writeFile } from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
  writeFile: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let writeFileMock: jest.MockedFunction<typeof writeFile>;
  let prismaMock: {
    user: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let hashingServiceMock: {
    hash: jest.Mock;
    compare: jest.Mock;
  };

  const createUserDto = {
    fullName: 'John Doe',
    email: 'john@doe.com',
    password: 'Strong@123',
  };

  const updatedUserPayload = {
    id: 'user-1',
    fullName: 'John Updated',
    email: 'john@doe.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
    writeFileMock.mockReset();

    prismaMock = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    hashingServiceMock = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    service = new UsersService(
      prismaMock as unknown as PrismaService,
      hashingServiceMock as unknown as HashingServiceProtocol,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      hashingServiceMock.hash.mockResolvedValue('hashed-password');
      prismaMock.user.create.mockResolvedValue(updatedUserPayload);

      const result = await service.create(createUserDto);

      expect(hashingServiceMock.hash).toHaveBeenCalledWith(
        createUserDto.password,
      );
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          password: 'hashed-password',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUserPayload);
    });

    it('should rethrow HttpException errors', async () => {
      const exception = new HttpException('hash failed', HttpStatus.CONFLICT);
      hashingServiceMock.hash.mockRejectedValue(exception);

      await expect(service.create(createUserDto)).rejects.toThrow(exception);
    });

    it('should throw bad request on unexpected errors', async () => {
      hashingServiceMock.hash.mockRejectedValue(new Error('unexpected'));

      await expect(service.create(createUserDto)).rejects.toMatchObject({
        message: 'Failed to create user',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('update', () => {
    const tokenPayload = { sub: 'user-1' };
    const updateUserDto = { fullName: 'John Updated' };

    it('should update user successfully', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prismaMock.user.update.mockResolvedValue(updatedUserPayload);

      const result = await service.update(
        'user-1',
        updateUserDto,
        tokenPayload,
      );

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fullName: 'John Updated' },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUserPayload);
    });

    it('should throw not found when user does not exist', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('missing-user', updateUserDto, tokenPayload),
      ).rejects.toMatchObject({
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw unauthorized when token user does not match target user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-2' });

      await expect(
        service.update('user-2', updateUserDto, tokenPayload),
      ).rejects.toMatchObject({
        message: 'Unauthorized',
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should rethrow HttpException errors', async () => {
      const exception = new HttpException('blocked', HttpStatus.FORBIDDEN);
      prismaMock.user.findFirst.mockRejectedValue(exception);

      await expect(
        service.update('user-1', updateUserDto, tokenPayload),
      ).rejects.toThrow(exception);
    });

    it('should throw bad request on unexpected errors', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prismaMock.user.update.mockRejectedValue(new Error('unexpected'));

      await expect(
        service.update('user-1', updateUserDto, tokenPayload),
      ).rejects.toMatchObject({
        message: 'Failed to update user',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('findOne', () => {
    it('should return user when it exists', async () => {
      prismaMock.user.findFirst.mockResolvedValue(updatedUserPayload);

      const result = await service.findOne('user-1');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUserPayload);
    });

    it('should throw not found when user does not exist', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-user')).rejects.toMatchObject({
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should rethrow HttpException errors', async () => {
      const exception = new HttpException('blocked', HttpStatus.FORBIDDEN);
      prismaMock.user.findFirst.mockRejectedValue(exception);

      await expect(service.findOne('user-1')).rejects.toThrow(exception);
    });

    it('should throw bad request on unexpected errors', async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error('unexpected'));

      await expect(service.findOne('user-1')).rejects.toMatchObject({
        message: 'Failed to retrieve user',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('delete', () => {
    const tokenPayload = { sub: 'user-1' };

    it('should delete user successfully', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prismaMock.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await service.delete('user-1', tokenPayload);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw not found when user does not exist', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('missing-user', tokenPayload),
      ).rejects.toMatchObject({
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw unauthorized when token user does not match target user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-2' });

      await expect(
        service.delete('user-2', tokenPayload),
      ).rejects.toMatchObject({
        message: 'Unauthorized',
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should rethrow HttpException errors', async () => {
      const exception = new HttpException('blocked', HttpStatus.FORBIDDEN);
      prismaMock.user.findFirst.mockRejectedValue(exception);

      await expect(service.delete('user-1', tokenPayload)).rejects.toThrow(
        exception,
      );
    });

    it('should throw bad request on unexpected errors', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prismaMock.user.delete.mockRejectedValue(new Error('unexpected'));

      await expect(
        service.delete('user-1', tokenPayload),
      ).rejects.toMatchObject({
        message: 'Failed to delete user',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('uploadAvatar', () => {
    const tokenPayload = { sub: 'user-1' };
    const file = {
      originalname: 'avatar.PNG',
      buffer: Buffer.from('avatar-content'),
    } as Express.Multer.File;

    it('should write file and update user avatar successfully', async () => {
      writeFileMock.mockResolvedValue(undefined);
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-1' });

      const avatarResponse = {
        id: 'user-1',
        fullName: 'John Doe',
        email: 'john@doe.com',
        avatar: 'user-1.png',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      };

      prismaMock.user.update.mockResolvedValue(avatarResponse);

      const result = await service.uploadAvatar(tokenPayload, file);

      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining('files'),
        file.buffer,
      );
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: tokenPayload.sub },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          avatar: 'user-1.png',
          updatedAt: expect.any(Date),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(avatarResponse);
    });

    it('should throw not found when user does not exist', async () => {
      writeFileMock.mockResolvedValue(undefined);
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadAvatar(tokenPayload, file),
      ).rejects.toMatchObject({
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
      });

      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should rethrow HttpException errors', async () => {
      const exception = new HttpException('blocked', HttpStatus.FORBIDDEN);
      writeFileMock.mockRejectedValue(exception);

      await expect(service.uploadAvatar(tokenPayload, file)).rejects.toThrow(
        exception,
      );
    });

    it('should throw bad request on unexpected errors', async () => {
      writeFileMock.mockRejectedValue(new Error('unexpected'));

      await expect(
        service.uploadAvatar(tokenPayload, file),
      ).rejects.toMatchObject({
        message: 'Failed to update user avatar',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('streak', () => {
    const tokenPayload = { sub: 'user-1' };

    it('should return current streak when last streak was today or yesterday', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        streak: 4,
        lastStreakAt: new Date(),
      });

      const result = await service.streak('user-1', tokenPayload);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          streak: true,
          lastStreakAt: true,
        },
      });
      expect(result).toEqual({
        streak: 4,
        lastStreakAt: expect.any(Date),
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return zero streak when user has never completed all due tasks', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        streak: 0,
        lastStreakAt: null,
      });

      const result = await service.streak('user-1', tokenPayload);

      expect(result).toEqual({
        streak: 0,
        lastStreakAt: null,
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should reset stale streak when the user broke the sequence', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        streak: 3,
        lastStreakAt: new Date('2026-03-25T10:00:00.000Z'),
      });
      prismaMock.user.update.mockResolvedValue({
        streak: 0,
        lastStreakAt: new Date('2026-03-25T10:00:00.000Z'),
      });

      const result = await service.streak('user-1', tokenPayload);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          streak: 0,
        },
      });
      expect(result).toEqual({
        streak: 0,
        lastStreakAt: new Date('2026-03-25T10:00:00.000Z'),
      });
    });

    it('should throw unauthorized when token user does not match target user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        streak: 2,
        lastStreakAt: new Date(),
      });

      await expect(
        service.streak('user-2', tokenPayload),
      ).rejects.toMatchObject({
        message: 'Unauthorized',
        status: HttpStatus.UNAUTHORIZED,
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw not found when user does not exist', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.streak('user-1', tokenPayload),
      ).rejects.toMatchObject({
        message: 'User not found',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should throw bad request on unexpected errors', async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error('unexpected'));

      await expect(
        service.streak('user-1', tokenPayload),
      ).rejects.toMatchObject({
        message: 'Failed to retrieve user streak',
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });
});
