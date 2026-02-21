export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING_BACKORDER = 'pending_backorder',
  PENDING_CANCEL = 'pending_cancel',
  CANCELED = 'canceled',
}

export enum BillingIntervalType {
  HOUR = 'hour',
  DAY = 'day',
  MONTH = 'month',
}

export enum BackorderStatus {
  PENDING = 'pending',
  RETRYING = 'retrying',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum ProvisioningStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  FAILED = 'failed',
}
