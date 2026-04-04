import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SignInDto } from './dtos/signin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingServiceProtocol } from './hash/hashing.service';
import jwtConfig from './config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly hashingServiceProtocol: HashingServiceProtocol,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
  ) {}

  async authenticate(signInDto: SignInDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: signInDto.email,
      },
    });

    if (!user) {
      throw new HttpException(
        'Failed to authenticate user',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordIsValid = await this.hashingServiceProtocol.compare(
      signInDto.password,
      user.password,
    );

    if (!passwordIsValid) {
      throw new HttpException(
        'Email or password is invalid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.jwtTtl,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      },
    );

    return {
      id: user.id,
      fullname: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token: token,
    };
  }
}
