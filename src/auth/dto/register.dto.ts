// src/auth/dto/register.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class RegisterDto {

  @ApiProperty({
    example: 'juan.gonzalez@clinica.cl',
    description: 'Email único del usuario',
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email!: string;

  @ApiProperty({
    example: 'Abcdef1!',
    description:
      'Contraseña con mínimo 8 caracteres, al menos una mayúscula, ' +
      'una minúscula, un número y un carácter especial',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })

  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'La contraseña debe contener al menos una mayúscula, ' +
        'una minúscula, un número y un carácter especial',
    },
  )
  password!: string;
}
