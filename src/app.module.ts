// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//* [SECURE-FIX V4] JwtAuthGuard se registra como APP_GUARD global
//* más abajo — por eso se importa aquí además del AuthModule.
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ValkeyModule } from './valkey/valkey.module';

// Importamos las configuraciones desde el barrel export
import { appConfig, databaseConfig, jwtConfig, valkeyConfig } from './config';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [

    ConfigModule.forRoot({

      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, valkeyConfig],
      envFilePath: '.env',
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        synchronize: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        ssl: configService.get<boolean>('database.ssl') ?? false,
      }),
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),

    CacheModule.register({ isGlobal: true }),

    ValkeyModule,

    UsersModule,

    PatientsModule,

    DoctorsModule,

    SpecialtiesModule,

    AppointmentsModule,

    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }