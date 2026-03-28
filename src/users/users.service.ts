import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { ResponseCreateUserDto } from './dtos/response-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

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
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to create user', HttpStatus.BAD_REQUEST);
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    tokenPayload: { sub: string },
  ) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id,
        },
        data: {
          fullName: updateUserDto.fullName,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to update user', HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async delete(id: string, tokenPayload: { sub: string }) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (user.id !== tokenPayload.sub) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      await this.prisma.user.delete({
        where: {
          id,
        },
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Failed to delete user', HttpStatus.BAD_REQUEST);
    }
  }
}
