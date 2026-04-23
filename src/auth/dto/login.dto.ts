// src/auth/dto/login.dto.ts

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {

  @ApiProperty({
    example: 'juan.gonzalez@clinica.cl',
    description: 'Email registrado del usuario',
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @ApiProperty({
    example: 'Abcdef1!',
    description: 'Contraseña del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password!: string;
}
