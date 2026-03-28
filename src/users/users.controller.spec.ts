import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthTokenGuard } from 'src/auth/guard/auth-token.guard';
import { PayloadTokenDto } from 'src/auth/dtos/payload-token.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersServiceMock: {
    create: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  const tokenPayload: PayloadTokenDto = {
    sub: 'user-1',
    email: 'john@doe.com',
    iat: 1711600000,
    exp: 1711603600,
    aud: 'test-audience',
    iss: 'test-issuer',
  };
  const userResponse = {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@doe.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersServiceMock = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req['tokenPayload'] = tokenPayload;
          return true;
        },
      })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should call service.create and return result', async () => {
      const createUserDto = {
        fullName: 'John Doe',
        email: 'john@doe.com',
        password: 'Strong@123',
      };
      usersServiceMock.create.mockResolvedValue(userResponse);

      const result = await controller.createUser(createUserDto);

      expect(usersServiceMock.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(userResponse);
    });
  });

  describe('updateUser', () => {
    it('should call service.update and return result', async () => {
      const updateUserDto = { fullName: 'John Updated' };
      usersServiceMock.update.mockResolvedValue(userResponse);

      const result = await controller.updateUser(
        'user-1',
        updateUserDto,
        tokenPayload,
      );

      expect(usersServiceMock.update).toHaveBeenCalledWith(
        'user-1',
        updateUserDto,
        tokenPayload,
      );
      expect(result).toEqual(userResponse);
    });
  });

  describe('findOneUser', () => {
    it('should call service.findOne and return result', async () => {
      usersServiceMock.findOne.mockResolvedValue(userResponse);

      const result = await controller.findOneUser('user-1');

      expect(usersServiceMock.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(userResponse);
    });
  });

  describe('deleteUser', () => {
    it('should call service.delete and return result', async () => {
      usersServiceMock.delete.mockResolvedValue({
        message: 'User deleted successfully',
      });

      const result = await controller.deleteUser('user-1', tokenPayload);

      expect(usersServiceMock.delete).toHaveBeenCalledWith(
        'user-1',
        tokenPayload,
      );
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });
});
