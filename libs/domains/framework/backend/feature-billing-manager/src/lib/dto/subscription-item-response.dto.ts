/**
 * Subscription item in API responses. Provider reference is internal only and never exposed.
 */
export interface SubscriptionItemResponseDto {
  id: string;
  subscriptionId: string;
  serviceTypeId: string;
  provisioningStatus: 'pending' | 'active' | 'failed';
}
