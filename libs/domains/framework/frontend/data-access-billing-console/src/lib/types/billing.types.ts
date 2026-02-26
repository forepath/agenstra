// Types based on OpenAPI spec for Billing Service API

// Enums
export type BillingIntervalType = 'hour' | 'day' | 'month';

export type SubscriptionStatus = 'active' | 'pending_backorder' | 'pending_cancel' | 'canceled';

export type BackorderStatus = 'pending' | 'retrying' | 'fulfilled' | 'cancelled' | 'failed';

export type UserRole = 'user' | 'admin';

// Provider details (GET /service-types/providers)
export interface ProviderDetail {
  id: string;
  displayName: string;
  configSchema?: Record<string, unknown>;
}

// Provider server type with specs and pricing (GET .../providers/:id/server-types)
export interface ServerType {
  id: string;
  name: string;
  cores: number;
  memory: number;
  disk: number;
  priceMonthly?: number;
  priceHourly?: number;
  description?: string;
}

// Service Types
export interface ServiceTypeResponse {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  provider: string;
  configSchema: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceTypeDto {
  key: string;
  name: string;
  description?: string;
  provider: string;
  configSchema?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateServiceTypeDto {
  name?: string;
  description?: string;
  provider?: string;
  configSchema?: Record<string, unknown>;
  isActive?: boolean;
}

// Service Plans
export interface ServicePlanResponse {
  id: string;
  serviceTypeId: string;
  name: string;
  description?: string | null;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
  billingDayOfMonth?: number | null;
  cancelAtPeriodEnd: boolean;
  minCommitmentDays: number;
  noticeDays: number;
  basePrice?: string | null;
  marginPercent?: string | null;
  marginFixed?: string | null;
  providerConfigDefaults: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePlanDto {
  serviceTypeId: string;
  name: string;
  description?: string;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd?: boolean;
  minCommitmentDays?: number;
  noticeDays?: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateServicePlanDto {
  name?: string;
  description?: string;
  billingIntervalType?: BillingIntervalType;
  billingIntervalValue?: number;
  billingDayOfMonth?: number;
  cancelAtPeriodEnd?: boolean;
  minCommitmentDays?: number;
  noticeDays?: number;
  basePrice?: string;
  marginPercent?: string;
  marginFixed?: string;
  providerConfigDefaults?: Record<string, unknown>;
  isActive?: boolean;
}

// Subscriptions
export interface SubscriptionResponse {
  id: string;
  number: string;
  planId: string;
  userId: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingAt?: string | null;
  cancelRequestedAt?: string | null;
  cancelEffectiveAt?: string | null;
  resumedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  requestedConfig?: Record<string, unknown>;
  preferredAlternatives?: Record<string, unknown>;
  autoBackorder?: boolean;
}

export interface CancelSubscriptionDto {
  reason?: string;
}

export interface ResumeSubscriptionDto {
  reason?: string;
}

// Subscription items and server info (overview / provisioned services)
export type ProvisioningStatus = 'pending' | 'active' | 'failed';

export interface SubscriptionItemResponse {
  id: string;
  subscriptionId: string;
  serviceTypeId: string;
  provisioningStatus: ProvisioningStatus;
}

export interface ServerInfoResponse {
  name: string;
  publicIp: string;
  privateIp?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

// Backorders
export interface BackorderResponse {
  id: string;
  userId: string;
  serviceTypeId: string;
  planId: string;
  status: BackorderStatus;
  failureReason?: string | null;
  requestedConfigSnapshot: Record<string, unknown>;
  providerErrors: Record<string, unknown>;
  preferredAlternatives: Record<string, unknown>;
  retryAfter?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackorderRetryDto {
  reason?: string;
  overrideConfig?: Record<string, unknown>;
}

export interface BackorderCancelDto {
  reason?: string;
}

// Availability
export interface AvailabilityCheckDto {
  serviceTypeId: string;
  region: string;
  serverType: string;
  requestedConfig?: Record<string, unknown>;
}

export interface AvailabilityResponse {
  isAvailable: boolean;
  reason?: string;
  alternatives?: Record<string, unknown>;
}

// Pricing
export interface PricingPreviewDto {
  planId: string;
  requestedConfig?: Record<string, unknown>;
}

export interface PricingPreviewResponse {
  basePrice: number;
  marginPercent: number;
  marginFixed: number;
  totalPrice: number;
}

// Customer Profile
export interface CustomerProfileResponse {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  invoiceNinjaClientId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileDto {
  firstName?: string;
  lastName?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  phone?: string;
}

// Invoices
export interface InvoiceResponse {
  id: string;
  subscriptionId: string;
  invoiceNinjaId: string;
  invoiceNumber?: string | null;
  preAuthUrl: string;
  status?: string | null;
  balance?: number | null;
  subscriptionNumber?: string | null;
  createdAt: string;
}

export interface CreateInvoiceDto {
  description?: string;
}

export interface CreateInvoiceResponse {
  invoiceId: string;
  preAuthUrl: string;
}

export interface RefreshInvoiceLinkResponse {
  preAuthUrl: string;
}

export interface InvoicesSummaryResponse {
  openOverdueCount: number;
  openOverdueTotal: number;
}

// Usage
export interface UsageSummary {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  usagePayload: Record<string, unknown>;
}

export interface CreateUsageRecordDto {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  usagePayload: Record<string, unknown>;
}

export interface UsageRecordResponse {
  id: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  usageSource: string;
  usagePayload: Record<string, unknown>;
  createdAt: string;
}

// Authentication
export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserResponse;
}

export interface RegisterDto {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: UserResponse;
  message: string;
}

export interface ConfirmEmailDto {
  email: string;
  code: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

// Users
export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  emailConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  role?: UserRole;
}

// Common
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}

export interface MessageResponse {
  message: string;
}

// Pagination
export interface ListParams {
  limit?: number;
  offset?: number;
}
