// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');


  app.useGlobalPipes(
    new ValidationPipe({

      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV === 'development') {

    app.use(
      '/api/docs',
      basicAuth({
        users: {
          [process.env.SWAGGER_USER ?? 'admin']:
            process.env.SWAGGER_PASSWORD ?? 'change-me',
        },
        challenge: true,
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('Clinic API')
      .setDescription(
        'API RESTful para gestión de clínica médica. ' +
        'Implementa OWASP Top 10 2025.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa el Access Token JWT obtenido en POST /auth/login',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
