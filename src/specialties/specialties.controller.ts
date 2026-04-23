// src/specialties/specialties.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';


@ApiTags('specialties')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('specialties')
export class SpecialtiesController {

  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear especialidad (solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Especialidad creada' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  @ApiResponse({ status: 409, description: 'Nombre ya registrado' })
  create(@Body() createSpecialtyDto: CreateSpecialtyDto) {
    return this.specialtiesService.create(createSpecialtyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar especialidades' })
  findAll() {
    return this.specialtiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener especialidad por id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar especialidad (solo ADMIN)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSpecialtyDto: UpdateSpecialtyDto,
  ) {
    return this.specialtiesService.update(id, updateSpecialtyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar especialidad (solo ADMIN)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.specialtiesService.remove(id);
  }
}
