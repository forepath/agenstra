import { UserRole } from '@forepath/identity/backend';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  emailConfirmedAt?: string;
  lockedAt?: string | null;
  createdAt!: string;
  updatedAt!: string;
}
