import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password confirmation must be at least 8 characters long' })
  newPasswordConfirmation!: string;
}
