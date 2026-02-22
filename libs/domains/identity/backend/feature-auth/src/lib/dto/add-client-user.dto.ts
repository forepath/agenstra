import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ClientUserRole } from '@forepath/identity/backend';

/**
 * DTO for adding a user to a client.
 * The user is identified by their email address.
 */
export class AddClientUserDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(ClientUserRole, { message: 'Role must be either admin or user' })
  role!: ClientUserRole;
}
