import { ConfigService } from '@nestjs/config';

const mockAdapter = { name: 'mock-adapter' };
const mockPrismaClientConstructor = jest.fn();

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => mockAdapter),
}));

jest.mock(
  'generated/prisma/client',
  () => ({
    PrismaClient: class {
      constructor(options: unknown) {
        mockPrismaClientConstructor(options);
      }
    },
  }),
  { virtual: true },
);

import { PrismaService } from './prisma.service';
import { PrismaPg } from '@prisma/adapter-pg';

describe('PrismaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  it('should throw when DATABASE_URL is not provided by ConfigService', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    expect(() => new PrismaService(configService)).toThrow(
      'DATABASE_URL is not defined',
    );

    expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
    expect(PrismaPg).not.toHaveBeenCalled();
    expect(mockPrismaClientConstructor).not.toHaveBeenCalled();
  });

  it('should create Prisma adapter and pass it to PrismaClient', () => {
    const connectionString = 'postgresql://user:pass@localhost:5432/tasks';
    const configService = {
      get: jest.fn().mockReturnValue(connectionString),
    } as unknown as ConfigService;

    const service = new PrismaService(configService);

    expect(service).toBeDefined();
    expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
    expect(PrismaPg).toHaveBeenCalledWith({ connectionString });
    expect(mockPrismaClientConstructor).toHaveBeenCalledWith({
      adapter: mockAdapter,
    });
  });
});
