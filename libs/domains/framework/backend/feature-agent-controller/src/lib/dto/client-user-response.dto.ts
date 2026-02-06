import { ClientUserRole } from '../entities/client-user.entity';

/**
 * DTO for client-user relationship API responses.
 */
export class ClientUserResponseDto {
  id!: string;
  userId!: string;
  clientId!: string;
  role!: ClientUserRole;
  userEmail?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
