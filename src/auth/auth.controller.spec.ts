import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: { authenticate: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { authenticate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call authenticate and return result', async () => {
      const signInDto = { email: 'john@doe.com', password: 'Strong@123' };
      const authResult = {
        id: 'user-1',
        email: 'john@doe.com',
        token: 'jwt-token',
      };
      authServiceMock.authenticate.mockResolvedValue(authResult);

      const result = await controller.signIn(signInDto);

      expect(authServiceMock.authenticate).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual(authResult);
    });
  });
});
