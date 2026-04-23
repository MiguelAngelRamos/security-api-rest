// src/common/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
