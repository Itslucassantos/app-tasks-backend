import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { ResponseCreateUserDto } from './dtos/response-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<ResponseCreateUserDto> {
    try {
      const hashedPassword = await this.hashingService.hash(
        createUserDto.password,
      );

      const user = await this.prisma.user.create({
        data: {
          fullName: createUserDto.fullName,
          email: createUserDto.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new HttpException('Failed to create user', HttpStatus.BAD_REQUEST);
    }
  }
}
