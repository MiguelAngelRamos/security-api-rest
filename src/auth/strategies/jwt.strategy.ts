// src/auth/strategies/jwt.strategy.ts

import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type Redis from 'ioredis';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {

  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject('VALKEY_CLIENT')
    private readonly valkeyClient: Redis,
  ) {

    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET no está definido en .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: configService.getOrThrow<string>('jwt.issuer'),
      audience: configService.getOrThrow<string>('jwt.audience'),
    });
  }


  async validate(payload: JwtPayload) {
 
    const user = await this.usersService.findOne(payload.sub);

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    try {
      const blocked = await this.valkeyClient.get(`blocklist:at:${payload.jti}`);
      if (blocked) {
        throw new UnauthorizedException('Token revocado');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(
        `Valkey blocklist check fallido — fail-open: ${(err as Error).message}`,
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
