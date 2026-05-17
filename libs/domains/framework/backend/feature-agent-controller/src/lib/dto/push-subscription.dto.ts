import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class RegisterPushSubscriptionDto {
  @IsUrl({ require_protocol: true })
  endpoint!: string;

  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  auth!: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class UnregisterPushSubscriptionDto {
  @IsUrl({ require_protocol: true })
  endpoint!: string;
}

export class VapidPublicKeyResponseDto {
  publicKey!: string;
  enabled!: boolean;
}
