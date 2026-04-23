// src/auth/auth.controller.ts

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { Public } from '../common/decorators/public.decorator';


const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}


  @Throttle({ default: { ttl: 600_000, limit: 5 } })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado y autenticado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(registerDto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      user: tokens.user,
    };
  }


  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      user: tokens.user,
    };
  }


  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  @ApiResponse({ status: 200, description: 'Token renovado' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {

    const cookies = (req as Request & {
      cookies?: Record<string, string>;
    }).cookies;
    const refreshToken = cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no presente');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        algorithms: ['HS256'],
        issuer: this.configService.getOrThrow<string>('jwt.issuer'),
        audience: this.configService.getOrThrow<string>('jwt.audience'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokens = await this.authService.refreshToken(
      payload.sub,
      refreshToken,
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      user: tokens.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  @ApiResponse({ status: 204, description: 'Logout exitoso' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async logout(
    @Req() req: Request & { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const authHeader = (req.headers as Record<string, string>)['authorization'] ?? '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    await this.authService.logout(req.user.id, accessToken);
    res.clearCookie(REFRESH_COOKIE, this.buildRefreshCookieOptions());
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.buildRefreshCookieOptions(),
      //* maxAge solo se setea en Set-Cookie; clearCookie lo ignora
      //* y por eso lo mantenemos fuera del helper compartido.
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private buildRefreshCookieOptions() {
    const env = this.configService.get<string>('app.nodeEnv');
    const secure = env !== 'development' && env !== 'test';
    return {
      httpOnly: true,
      secure,
      sameSite: 'strict' as const,
      path: REFRESH_COOKIE_PATH,
    };
  }
}
