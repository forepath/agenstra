# Billing Feature

Backend billing module providing subscription management, backorders, availability checks, and InvoiceNinja integration.

## Contents

- Service types and plans (admin endpoints).
- Subscription ordering, cancel, resume for authenticated users.
- Backorder management for provider capacity failures.
- Availability snapshots and pricing previews.
- Invoice listing via stored InvoiceNinja pre-auth links.
- **Open positions and user billing day:** Recurring and final subscription charges are recorded as open positions.
  On each user's billing day (default: day of month of registration, capped at 28), one accumulated invoice per user
  is created with all of that user's unbilled positions as line items. This reduces the number of invoices (one per
  user per billing day). The user billing day is independent of the service plan's `billing_day_of_month`.
- Customer profile management for invoicing metadata.
- Usage-based pricing supported via usage records.

## Auth

All endpoints require authentication. Admin-only routes use the same role guards as the agent controller:

- @KeycloakRoles(UserRole.ADMIN)
- @UsersRoles(UserRole.ADMIN)

API key auth is supported through the shared HybridAuthGuard at the app level.

## Environment

- INVOICE_NINJA_BASE_URL
- INVOICE_NINJA_API_TOKEN
- DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- HETZNER_API_TOKEN
- OPEN_POSITION_INVOICE_SCHEDULER_INTERVAL (optional; default 86400000 ms = daily)
- SUBSCRIPTION_UPDATE_SCHEDULER_INTERVAL (optional; default 86400000 ms = 24 hours; SSH update scheduler)
- CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID (for DNS A record creation on provisioned servers)
- DNS_BASE_DOMAIN (optional; default `spirde.com`) – base domain for FQDN in SSL certificates and CORS

## Users Authentication

When AUTHENTICATION_METHOD=users, this service uses a local users table identical to the agent-controller schema.
The migration `apps/backend-billing-manager/src/migrations/1767101000000_CreateUsersTable.ts` creates the required table.

## Customer Profile

Use `GET /customer-profile` to retrieve the profile and `POST /customer-profile` to update it. The profile is synced
to InvoiceNinja on invoice list requests.

**Required for ordering (step 0):** Subscription creation (`POST /subscriptions`) requires a complete customer billing
profile. The backend returns 400 if the profile is missing or incomplete. Required fields: first name, last name, email,
address line, city, country. See `docs/billing-profile-required-for-order-spec.md` and `docs/sequence-subscription-order.mmd`.

Usage records can be posted to `POST /usage/record` and will be included in invoice creation if a `usagePayload` with
`totalCost` or `usageCost` is present, or when `units` and `unitPrice` are provided.

## Provider details

`GET /service-types/providers` returns all registered provisioning providers with id, display name, and optional config schema. This is used by the billing console to show a provider dropdown when creating service types and to render provider default config fields when creating/editing service plans. Providers are registered at startup (e.g. Hetzner) via `ProviderRegistryService`; add new providers in `BillingModule.onModuleInit()` or by injecting and calling `ProviderRegistryService.register()`.

**Config schema shape:** The optional `configSchema` is a JSON-schema-like object with a `properties` map. Each property may include:

- `type`: `'string'` or `'number'`
- `description`: optional label/help text
- `enum`: optional array of allowed values (e.g. `['fsn1', 'nbg1']`). When present, the billing console renders a select instead of a text/number input.

**Base price from field:** The schema may include a top-level `basePriceFromField` (e.g. `'serverType'`). When set, the billing console fetches options from `GET /service-types/providers/:providerId/server-types` for that field and uses the selected option’s `priceMonthly` as the plan base price when the user selects a server type.

**Server types endpoint:** `GET /service-types/providers/:providerId/server-types` returns server types with specs and pricing for the given provider (e.g. `hetzner`). Used by the billing console to show a server type dropdown (name, cores, memory, disk, price) and to auto-set the plan base price when `configSchema.basePriceFromField` is `'serverType'`.

## Provisioning Config

Subscription creation (`POST /subscriptions`) first checks that the customer billing profile is complete (see Customer
Profile above); otherwise the request is rejected with 400. It then accepts provider-specific configuration that is
validated against the service type schema.
For Hetzner provisioning, the following config keys are used:

- location (string, required by default schema; enum pre-populated in UI)
- serverType (string, required; options and price from GET .../server-types; selection can auto-set plan base price)
- firewallId (number, optional)

Optional instance configuration (requestedConfig) can include authentication (users, api-key, keycloak), SMTP, and optional provisioning tokens so the instance can provision additional servers itself:

- hetznerApiToken (string, optional) – Hetzner API token for nested provisioning from the instance
- digitaloceanApiToken (string, optional) – DigitalOcean API token for nested provisioning from the instance

The cloud-init user data installs Docker and deploys a docker-compose stack containing:

- postgres
- backend-agent-controller
- frontend-agent-console

Nginx proxies `/backend/` to the backend API (with path stripped). SSL certificates and CORS are configured using
the FQDN (`hostname.DNS_BASE_DOMAIN`) for proper HTTPS and same-origin requests.

## Server info

`GET /subscriptions/{subscriptionId}/items/{itemId}/server-info` returns live server info for a provisioned subscription
item (status, public/private IP, hostname, FQDN).

## Subscription item update scheduler

A scheduler runs at a configurable interval (`SUBSCRIPTION_UPDATE_SCHEDULER_INTERVAL`, default 24 hours), connects to each
provisioned subscription host via SSH (using the key stored on the subscription item), and runs
`docker compose up -d --pull=always` in the app directory (`/opt/agent-controller` or `/opt/agent-manager`). This pulls
the latest images and recreates containers so updates are applied. Failures are logged on the host to
`/var/log/agent-controller-update.log` or `/var/log/agent-manager-update.log`. See
`docs/sequence-subscription-item-update.mmd` for the flow.

## Diagrams

- docs/overview.mmd
- docs/sequence-subscription-order.mmd (order flow: step 0 = profile completeness, then availability and provisioning)
- docs/billing-profile-required-for-order-spec.md (spec for profile-required-for-order behavior)
- docs/sequence-invoicing.mmd
- docs/sequence-open-positions-billing-day.mmd (open positions, user billing day, billing-day invoice scheduler)
- docs/sequence-backorder-retry.mmd
- docs/sequence-subscription-item-update.mmd (update scheduler: SSH + docker compose pull)
- docs/provisioning-architecture.mmd
- docs/subscription-lifecycle.mmd
- docs/auth-flow.mmd
- docs/sequence-invoice-ninja-sync.mmd
- docs/config-validation-flow.mmd
