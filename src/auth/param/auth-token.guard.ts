import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  REQUEST_TOKEN_PAYLOAD_NAME,
  RequestWithTokenPayload,
} from '../common/auth.constants';

export const TokenPayloadParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const contexto = ctx.switchToHttp();
    const request: RequestWithTokenPayload = contexto.getRequest();

    return request[REQUEST_TOKEN_PAYLOAD_NAME];
  },
);
