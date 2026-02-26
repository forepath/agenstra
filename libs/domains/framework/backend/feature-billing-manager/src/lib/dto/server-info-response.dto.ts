/**
 * Server info returned by the API. Provider-specific server ID is intentionally
 * omitted (internal only); all other fields are safe for the customer.
 */
export interface ServerInfoResponseDto {
  name: string;
  publicIp: string;
  privateIp?: string;
  status: string;
  metadata?: Record<string, unknown>;
}
