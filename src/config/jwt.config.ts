// src/config/jwt.config.ts
import { registerAs } from '@nestjs/config';

const MIN_SECRET_LENGTH = 32;

function assertSecret(name: string, value: string | undefined): string {
  if (!value || value.length < MIN_SECRET_LENGTH) {
    const msg =
      `${name} debe tener al menos ${MIN_SECRET_LENGTH} caracteres ` +
      `aleatorios (usa: openssl rand -base64 48)`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
    // eslint-disable-next-line no-console
    console.warn(`[jwt.config] WARN ${msg}`);
  }
  return value ?? '';
}

// Namespace 'jwt' — acceso: configService.get('jwt.secret')
export default registerAs('jwt', () => ({
  secret: assertSecret('JWT_SECRET', process.env.JWT_SECRET),
  expiration: process.env.JWT_EXPIRATION || '15m',
  refreshSecret: assertSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
  ),
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  issuer: process.env.JWT_ISSUER || 'clinic-api',
  audience: process.env.JWT_AUDIENCE || 'clinic-web',
}));
