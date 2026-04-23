// src/appointments/dto/update-status.dto.ts

import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../entities/appointment.entity';

export class UpdateStatusDto {

  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @IsEnum(AppointmentStatus, {
    message: `El estado debe ser uno de: ${Object.values(AppointmentStatus).join(', ')}`,
  })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status!: AppointmentStatus;
}
