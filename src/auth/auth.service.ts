// src/auth/auth.service.ts

import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('VALKEY_CLIENT')
    private readonly valkeyClient: Redis,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      role: UserRole.PATIENT,
    });

    this.logger.log(`Nuevo usuario registrado: ${user.email}`);

    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthTokens> {

    this.logger.log(`Intento de login para: ${email}`);

    const user = await this.validateUser(email, password);

    if (!user) {
      this.logger.warn(`Login fallido para email: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }
    const valid = await argon2.verify(user.passwordHash, password);

    if (!valid) {
      return null;
    }

    return user;
  }

  async refreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (!user.refreshTokenHash) {
      this.logger.warn(
        `Refresh sin hash activo para userId ${userId} — posible reuso post-logout`,
      );
      throw new UnauthorizedException('Refresh token inválido');
    }

    const valid = await argon2.verify(user.refreshTokenHash, refreshToken);

    if (!valid) {
      this.logger.error(
        `Refresh reuse detectado para userId ${userId}. Revocando familia.`,
      );
      await this.userRepository.update(userId, { refreshTokenHash: null });
      throw new UnauthorizedException(
        'Reuso de refresh token detectado. Sesión revocada.',
      );
    }
    return this.issueTokens(user);
  }
  async logout(userId: string, accessToken: string): Promise<void> {

    const decoded = this.jwtService.decode<{ jti?: string; exp?: number }>(accessToken);

    if (decoded?.jti && decoded?.exp) {
   
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        try {
        
          await this.valkeyClient.set(`blocklist:at:${decoded.jti}`, '1', 'EX', ttl);
        } catch (err) {

          this.logger.error(
            `Blocklist Valkey error en logout: ${(err as Error).message}`,
          );
        }
      }
    }

    await this.userRepository.update(userId, { refreshTokenHash: null });
    this.logger.log(`Logout para userId: ${userId}`);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    const issuer = this.configService.getOrThrow<string>('jwt.issuer');
    const audience = this.configService.getOrThrow<string>('jwt.audience');

    const accessOptions = {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.expiration'),
      algorithm: 'HS256',
      issuer,
      audience,
    } as JwtSignOptions;

    const refreshOptions = {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.refreshExpiration'),
      algorithm: 'HS256',
      issuer,
      audience,
    } as JwtSignOptions;

    const accessToken = await this.jwtService.signAsync(payload, accessOptions);
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      refreshOptions,
    );
    
    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.userRepository.update(user.id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
