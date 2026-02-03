import { UserRole } from '../../entities/user.entity';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  emailConfirmedAt?: string;
  createdAt!: string;
  updatedAt!: string;
}
