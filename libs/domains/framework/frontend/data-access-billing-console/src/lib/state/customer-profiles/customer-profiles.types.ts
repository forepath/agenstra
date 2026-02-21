export interface CustomerProfileResponseDto {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  email?: string;
  phone?: string;
  country?: string;
  invoiceNinjaClientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileDto {
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  email?: string;
  phone?: string;
  country?: string;
}
