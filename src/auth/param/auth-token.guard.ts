import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants';

export const TokenPayloadParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const contexto = ctx.switchToHttp();
    const request: Request = contexto.getRequest();

    return request[REQUEST_TOKEN_PAYLOAD_NAME];
  },
);
