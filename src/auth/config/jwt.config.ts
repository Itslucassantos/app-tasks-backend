import { registerAs } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET as string,
  audience: process.env.JWT_TOKEN_AUDIENCE as string,
  issuer: process.env.JWT_TOKEN_ISSUER as string,
  jwtTtl: process.env.JWT_TTL as SignOptions['expiresIn'],
}));
