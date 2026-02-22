# Billing Feature

Backend billing module providing subscription management, backorders, availability checks, and InvoiceNinja integration.

## Contents

- Service types and plans (admin endpoints).
- Subscription ordering, cancel, resume for authenticated users.
- Backorder management for provider capacity failures.
- Availability snapshots and pricing previews.
- Invoice listing via stored InvoiceNinja pre-auth links.
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

## Users Authentication

When AUTHENTICATION_METHOD=users, this service uses a local users table identical to the agent-controller schema.
The migration `apps/backend-billing-manager/src/migrations/1767101000000_CreateUsersTable.ts` creates the required table.

## Customer Profile

Use `GET /customer-profile` to retrieve the profile and `POST /customer-profile` to update it. The profile is synced
to InvoiceNinja on invoice list requests.

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

Subscription creation accepts provider-specific configuration that is validated against the service type schema.
For Hetzner provisioning, the following config keys are used:

- location (string, required by default schema; enum pre-populated in UI)
- serverType (string, required; options and price from GET .../server-types; selection can auto-set plan base price)
- firewallId (number, optional)

The cloud-init user data installs Docker and deploys a docker-compose stack containing:

- postgres
- backend-agent-controller
- frontend-agent-console

## Diagrams

- docs/overview.mmd
- docs/sequence-subscription-order.mmd
- docs/sequence-invoicing.mmd
- docs/sequence-backorder-retry.mmd
- docs/provisioning-architecture.mmd
- docs/subscription-lifecycle.mmd
- docs/auth-flow.mmd
- docs/sequence-invoice-ninja-sync.mmd
- docs/config-validation-flow.mmd
