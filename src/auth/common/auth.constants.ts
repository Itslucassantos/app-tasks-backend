import { Request } from 'express';
import { PayloadTokenDto } from '../dtos/payload-token.dto';

export const REQUEST_TOKEN_PAYLOAD_NAME = 'token_payload';

export type RequestWithTokenPayload = Request & {
  [REQUEST_TOKEN_PAYLOAD_NAME]?: PayloadTokenDto;
};
