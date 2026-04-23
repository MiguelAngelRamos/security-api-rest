## IDOR Insecure Direct Object Reference

¿Qué es? El sistema no controla correctamente quién puede hacer qué. Un usuario puede acceder a recursos o realizar acciones para las que no tiene permiso.

URL:
clinica.cl/api/v1/appointments/550e8400-e29b-41d4-a716-446655440000

URL:
clinica.cl/api/v1/appointments/7c9e6679-7425-40de-944b-e07fc1f90ae7


## UUID pero resuelve todo el problema?

Existen formas de obtener UUID ajeno sin adivinarlo

 - Logs del sistema estan mal configurados (exponen IDs en respuestas error)
 - Acceso fisico al dispositivo de la victima
 - Un insider con acceso a la base de datos


## Como resolvemos esto?

CAPA 1 un contrato de identidad

```typescript
// src/common/types/authenticated-user.interface.ts

import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
  id: string; // UUID del usuario - extraido del JWT firmado
  email: string;
  role: UserRole; // ADMIN | DOCTOR | PATIENT
}
```

CAPA 2 @CurrentUser entregar la identidad 

```typescript
  @Get(':id')
  @ApiOperation({ summary: 'Obtener cita por id (ownership)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,  // lo que cliente pide
    @CurrentUser() user: AuthenticatedUser,  // Quien es el cliente REALMENTE
  ) {
    return this.appointmentsService.findOne(id, user);
  }

```
CAPA 3 - Guardian Central de IDOR

```typescript
  private async assertCanAccess(
    user: AuthenticatedUser,
    appointment: Appointment,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    if (user.role === UserRole.PATIENT) {
      const patient = await this.patientRepository.findOne({
        where: { userId: user.id },
      });
      if (patient && patient.id === appointment.patientId) return;
    }

    if (user.role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepository.findOne({
        where: { userId: user.id },
      });
      if (doctor && doctor.id === appointment.doctorId) return;
    }

    throw new ForbiddenException(
      'No tienes permisos para acceder a esta cita',
    );
  }

```