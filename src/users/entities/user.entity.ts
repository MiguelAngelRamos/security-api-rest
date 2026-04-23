// src/users/entities/user.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';


export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}


@Entity('users')
export class User {

  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ unique: true, length: 255 })
  email!: string;
  @Column({ name: 'password_hash' })
  passwordHash!: string;
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role!: UserRole;
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash!: string | null;
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}