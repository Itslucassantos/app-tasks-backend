import { HttpStatus } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: { user: { findFirst: jest.Mock } };
  let hashingServiceMock: { hash: jest.Mock; compare: jest.Mock };
  let jwtServiceMock: { signAsync: jest.Mock };
  let jwtConfigMock: ConfigType<typeof jwtConfig>;

  const signInDto = { email: 'john@doe.com', password: 'Strong@123' };
  const dbUser = {
    id: 'user-1',
    email: 'john@doe.com',
    password: 'hashed-password',
    fullName: 'John Doe',
  };

  beforeEach(() => {
    prismaMock = { user: { findFirst: jest.fn() } };
    hashingServiceMock = { hash: jest.fn(), compare: jest.fn() };
    jwtServiceMock = { signAsync: jest.fn() };
    jwtConfigMock = {
      secret: 'test-secret',
      jwtTtl: '3600s',
      audience: 'test-audience',
      issuer: 'test-issuer',
    };

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      hashingServiceMock as unknown as HashingServiceProtocol,
      jwtConfigMock,
      jwtServiceMock as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticate', () => {
    it('should return token and user data on success', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      hashingServiceMock.compare.mockResolvedValue(true);
      jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

      const result = await service.authenticate(signInDto);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(hashingServiceMock.compare).toHaveBeenCalledWith(
        signInDto.password,
        dbUser.password,
      );
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        { sub: dbUser.id, email: dbUser.email },
        {
          secret: jwtConfigMock.secret,
          expiresIn: jwtConfigMock.jwtTtl,
          audience: jwtConfigMock.audience,
          issuer: jwtConfigMock.issuer,
        },
      );
      expect(result).toEqual({
        id: dbUser.id,
        fullname: dbUser.fullName,
        email: dbUser.email,
        token: 'jwt-token',
      });
    });

    it('should throw 401 when user is not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.authenticate(signInDto)).rejects.toMatchObject({
        message: 'Failed to authenticate user',
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('should throw 401 when password is invalid', async () => {
      prismaMock.user.findFirst.mockResolvedValue(dbUser);
      hashingServiceMock.compare.mockResolvedValue(false);

      await expect(service.authenticate(signInDto)).rejects.toMatchObject({
        message: 'Email or password is invalid',
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });
});
