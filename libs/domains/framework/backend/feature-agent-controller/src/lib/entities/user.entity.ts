import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * User entity for the "users" authentication method.
 * Passwords are stored as bcrypt hashes (never use encryption transformer).
 * Keycloak-linked users have keycloak_sub set and password_hash null.
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'email' })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ type: 'varchar', length: 50, name: 'role', default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'timestamp', name: 'email_confirmed_at', nullable: true })
  emailConfirmedAt?: Date;

  @Column({ type: 'varchar', length: 255, name: 'email_confirmation_token', nullable: true })
  emailConfirmationToken?: string;

  @Column({ type: 'varchar', length: 255, name: 'password_reset_token', nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', name: 'password_reset_token_expires_at', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  @Column({ type: 'varchar', length: 255, name: 'keycloak_sub', nullable: true })
  keycloakSub?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
