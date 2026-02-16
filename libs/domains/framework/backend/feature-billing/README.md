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
The migration `apps/backend-billing/src/migrations/1767101000000_CreateUsersTable.ts` creates the required table.

## Customer Profile

Use `GET /customer-profile` to retrieve the profile and `POST /customer-profile` to update it. The profile is synced
to InvoiceNinja on invoice list requests.

Usage records can be posted to `POST /usage/record` and will be included in invoice creation if a `usagePayload` with
`totalCost` or `usageCost` is present, or when `units` and `unitPrice` are provided.

## Provisioning Config

Subscription creation accepts provider-specific configuration that is validated against the service type schema.
For Hetzner provisioning, the following config keys are used:

- region (string, required by default schema)
- serverType (string, required by default schema)
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
