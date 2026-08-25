import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import jwtConfig from '../config/jwt.config';
import { PayloadTokenDto } from '../dtos/payload-token.dto';
import {
  REQUEST_TOKEN_PAYLOAD_NAME,
  RequestWithTokenPayload,
} from '../common/auth.constants';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: RequestWithTokenPayload = context
      .switchToHttp()
      .getRequest();
    const token = this.extractTokenHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadTokenDto>(
        token,
        this.jwtConfiguration,
      );

      request[REQUEST_TOKEN_PAYLOAD_NAME] = payload;

      const user = await this.prismaService.user.findFirst({
        where: {
          id: payload?.sub,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Unauthorized access');
      }
    } catch {
      throw new UnauthorizedException('Unauthorized access');
    }

    return true;
  }

  extractTokenHeader(request: RequestWithTokenPayload) {
    const authorization = request.headers?.authorization;

    if (!authorization || typeof authorization !== 'string') {
      return;
    }

    return authorization.split(' ')[1];
  }
}
