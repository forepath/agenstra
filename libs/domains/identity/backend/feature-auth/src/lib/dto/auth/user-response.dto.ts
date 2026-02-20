import { UserRole } from '@forepath/identity/backend';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  emailConfirmedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}
