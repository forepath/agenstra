import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class ConfirmEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Code must be exactly 6 characters (uppercase letters and numbers)' })
  code!: string;
}
