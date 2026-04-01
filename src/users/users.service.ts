import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import {
  ResponseCreateUserDto,
  ResponseUserStreakDto,
  ResponseUpdateAvatarDto,
} from './dtos/response-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  private getDayStart(referenceDate = new Date()): Date {
    const dayStart = new Date(referenceDate);
    dayStart.setHours(0, 0, 0, 0);
    return dayStart;
  }

  private isSameDay(firstDate: Date, secondDate: Date): boolean {
    return (
      this.getDayStart(firstDate).getTime() ===
      this.getDayStart(secondDate).getTime()
    );
  }

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
  ): Promise<ResponseCreateUserDto> {
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

  async findOne(id: string): Promise<ResponseCreateUserDto> {
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

  async delete(
    id: string,
    tokenPayload: { sub: string },
  ): Promise<{ message: string }> {
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

  async uploadAvatar(
    tokenPayload: { sub: string },
    file: Express.Multer.File,
  ): Promise<ResponseUpdateAvatarDto> {
    try {
      const fileExtension = path
        .extname(file.originalname)
        .toLowerCase()
        .substring(1);

      const fileName = `${tokenPayload.sub}.${fileExtension}`;
      const fileLocale = path.resolve(process.cwd(), 'files', fileName);

      await fs.writeFile(fileLocale, file.buffer);

      const user = await this.prisma.user.findFirst({
        where: {
          id: tokenPayload.sub,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          avatar: fileName,
          updatedAt: new Date(),
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

      return updatedUser;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update user avatar',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async streak(
    id: string,
    tokenPayload: { sub: string },
  ): Promise<ResponseUserStreakDto> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: id,
        },
        select: {
          streak: true,
          lastStreakAt: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (id !== tokenPayload.sub) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      if (!user.lastStreakAt) {
        return {
          streak: 0,
          lastStreakAt: null,
        };
      }

      const todayStart = this.getDayStart(new Date());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      if (
        this.isSameDay(user.lastStreakAt, todayStart) ||
        this.isSameDay(user.lastStreakAt, yesterdayStart)
      ) {
        return user;
      }

      await this.prisma.user.update({
        where: {
          id: id,
        },
        data: {
          streak: 0,
        },
      });

      return {
        streak: 0,
        lastStreakAt: user.lastStreakAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve user streak',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
