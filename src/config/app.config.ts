// src/config/app.config.ts
import { registerAs } from '@nestjs/config';


export default registerAs('app', () => ({
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
}));