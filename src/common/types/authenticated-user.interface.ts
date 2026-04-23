// src/common/types/authenticated-user.interface.ts

import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
