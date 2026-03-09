# Order Process and Instance Configuration

This document describes how orders/subscriptions are created and fulfilled, where userData/cloud-init is built, provider/instance configuration types and validation, and how the frontend sends instance config to the backend. It also indicates where to add "Service" (Controller/Manager) and conditional fields.

---

## 1. Backend: feature-billing-manager

### 1.1 Order / subscription creation and fulfillment

**Flow (high level):**

1. Client sends `POST /subscriptions` with `CreateSubscriptionDto` (planId, optional requestedConfig, optional autoBackorder).
2. Backend loads plan and service type, merges `plan.providerConfigDefaults` with `requestedConfig` → **effectiveConfig**.
3. Config is validated against `serviceType.configSchema` via `validateConfigSchema`.
4. Availability is checked (`AvailabilityService.checkAvailability(provider, region, serverType)`).
5. If **not available** and `autoBackorder`: create backorder and return 400. If **available**: create subscription + subscription_item, then provision (Hetzner).

**Key file paths and types:**

| Purpose                  | File path                                          | Key types / functions                                                                                                                                            |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create subscription DTO  | `src/lib/dto/create-subscription.dto.ts`           | `CreateSubscriptionDto`: planId, requestedConfig?, preferredAlternatives?, autoBackorder?                                                                        |
| Subscriptions controller | `src/lib/controllers/subscriptions.controller.ts`  | `POST /subscriptions` → `subscriptionService.createSubscription(userId, dto.planId, dto.requestedConfig, dto.autoBackorder)`                                     |
| Subscription service     | `src/lib/services/subscription.service.ts`         | `createSubscription()`: plan + serviceType load, effectiveConfig merge, validateConfigSchema, availability, create subscription + item, provision (Hetzner), DNS |
| Backorder service        | `src/lib/services/backorder.service.ts`            | `create()`, `retry()`: on retry, creates subscription + item and provisions using `requestedConfigSnapshot` + plan defaults                                      |
| Config validation        | `src/lib/utils/config-validation.utils.ts`         | `ConfigSchema`, `validateConfigSchema(schema, config)`                                                                                                           |
| Provisioning             | `src/lib/services/provisioning.service.ts`         | `provision(provider, config)` → Hetzner; config includes name, serverType, location, firewallId?, userData                                                       |
| Hetzner provisioning     | `src/lib/services/hetzner-provisioning.service.ts` | Expects config with `name`, `serverType`, `location`, `firewallId?`, `userData` (base64)                                                                         |
| Sequence diagram         | `docs/sequence-subscription-order.mmd`             | End-to-end subscription order flow                                                                                                                               |

**Fulfillment path (when available):**

- `SubscriptionService.createSubscription` → `subscriptionItemsRepository.create(subscriptionId, serviceTypeId, configSnapshot: effectiveConfig)` → if provider === 'hetzner': reserve hostname → build userData → `provisioningService.provision('hetzner', { name, serverType, location, firewallId, userData })` → update item with providerReference and provisioningStatus → create DNS A record.

**Backorder path:**

- `BackorderService.retry()` loads backorder, plan, serviceType; checks availability; creates subscription + item; provisions with `effectiveConfig = plan.providerConfigDefaults + backorder.requestedConfigSnapshot`; marks backorder fulfilled.

---

### 1.2 Where userData / cloud-init is built and applied

**Built in:**

- **`src/lib/utils/cloud-init/agent-controller.utils.ts`**
  - **`buildAgentControllerCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain?)`**  
    Builds a full `AgentControllerCloudInitConfig` from the effective config (plan defaults + requestedConfig) and hostname. Generates random `encryptionKey` and `jwtSecret`. Reads from effectiveConfig: authenticationMethod, disableSignup, staticApiKey, keycloak, smtp, hetznerApiToken, digitaloceanApiToken. Default baseDomain is `spirde.com`.
  - **`buildAgentControllerCloudInitUserData(config: AgentControllerCloudInitConfig)`**  
    Produces the cloud-init user-data script (bash) that: updates system, installs Docker, creates `/opt/agent-controller`, nginx config, SSL cert, docker-compose (postgres, backend-agent-controller, frontend-agent-console-server, nginx), and runs `docker compose up -d`. Returns the script **base64-encoded** for the provider API.

**Used in:**

- **`SubscriptionService.createSubscription`** (when provider === 'hetzner'):
  - If **`effectiveConfig.service === 'manager'`**: `userData: buildAgentManagerCloudInitUserData(buildAgentManagerCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain))`.
  - Otherwise (controller or default): `userData: buildBillingCloudInitUserData(buildCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain))`.
- **`BackorderService.retry`** (when provider === 'hetzner'):
  - Same branching by **`effectiveConfig.service`**; manager uses **`agent-manager.utils.ts`**, controller uses **`agent-controller.utils.ts`** (aliases `buildBillingCloudInitUserData` / `buildCloudInitConfigFromRequest`).

**Agent-manager cloud-init (`agent-manager.utils.ts`):**

- **`AgentManagerCloudInitConfig`** — Same structural pattern as controller but: no `backend.provisioning`, no `backend.authentication.disableSignup`; `authenticationMethod` only `'api-key' | 'keycloak'` (manager does not support `users`).
- **`buildAgentManagerCloudInitConfigFromRequest(effectiveConfig, hostname, baseDomain?)`** — Coerces `authenticationMethod === 'users'` to `'api-key'`; does not read disableSignup or provisioning tokens.
- **`buildAgentManagerCloudInitUserData(config)`** — Uses `formatEnvLines` from `env.utils.ts`; produces bash script that installs Docker, creates `/opt/agent-manager`, nginx config, SSL cert, docker-compose (postgres, backend-agent-manager, nginx), then `docker compose up -d`. Returns base64-encoded script.

**Note on export names:**  
`agent-controller.utils.ts` exports aliases: `buildBillingCloudInitUserData`, `buildCloudInitConfigFromRequest`, and type `CloudInitConfig`. It also imports **`formatEnvLines as formatEnv`** from `./env.utils`.

**Applied:**  
The resulting base64 userData is passed to `HetznerProvisioningService.provisionServer(config)` and sent to the Hetzner API as `user_data` when creating the server. Cloud-init on the VM runs the script on first boot.

---

### 1.3 Cloud-init utils: agent-controller and env formatter

**Agent-controller cloud-init (`agent-controller.utils.ts`):**

- **`AgentControllerCloudInitConfig`**  
  Typed structure: host (hostname, fqdn), proxy (ports), frontend (host, port, nodeEnv, defaultLocale), backend (host, port, websocketPort, websocketNamespace, nodeEnv, defaultLocale, database, authentication, encryption, smtp, cors, rateLimit, provisioning (hetznerApiToken, digitaloceanApiToken)).
- **`buildAgentControllerCloudInitConfigFromRequest`**  
  Maps effectiveConfig + hostname + baseDomain → AgentControllerCloudInitConfig (with generated secrets).
- **`buildAgentControllerCloudInitUserData`**  
  Uses **`formatEnv`** (imported as `formatEnvLines as formatEnv` from `./env.utils`) to format env vars for backend and frontend containers. Then builds:
  - backend env block
  - frontend env block
  - frontend config JSON (controller URLs, billing, authentication, cookieConsent, etc.)
  - docker-compose YAML (postgres, backend-agent-controller, frontend-agent-console-server, nginx)
  - nginx config
  - bash script (cloud-init user-data) that writes nginx config, generates SSL cert, writes docker-compose, runs `docker compose up -d`  
    Returns `Buffer.from(script).toString('base64')`.

**Env formatter (`env.utils.ts`):**

- **`formatEnvLines(lines: string[])`**  
  Maps each line to a trimmed line prefixed with 6 spaces, filters empty, joins with newline. Used by both **agent-controller.utils.ts** (imported as `formatEnv`) and **agent-manager.utils.ts** for formatting env blocks in the generated YAML.

**References:**

- Subscription service: `src/lib/services/subscription.service.ts` (builds userData for new subscriptions).
- Backorder service: `src/lib/services/backorder.service.ts` (builds userData when fulfilling a backorder).

---

### 1.4 Provider / instance configuration types, DTOs, validation

**Instance configuration shape:**

- **effectiveConfig** = `plan.providerConfigDefaults` merged with `requestedConfig` (request wins).
- Stored on the subscription item as **`configSnapshot`** (e.g. in `SubscriptionItemEntity.configSnapshot`).
- Used for: validation, provisioning (region, serverType, firewallId, and all cloud-init fields), and building userData.

**DTOs:**

- **`CreateSubscriptionDto`** (`src/lib/dto/create-subscription.dto.ts`): planId (required), requestedConfig? (object), preferredAlternatives?, autoBackorder?.
- **RequestedConfig** (OpenAPI `spec/openapi.yaml`): optional cloud-init and provisioning; may include authenticationMethod, staticApiKey, disableSignup, smtp, keycloak, hetznerApiToken, digitaloceanApiToken; plus provider-specific (e.g. serverType, region, firewallId for Hetzner).

**Validation:**

- **`validateConfigSchema(serviceType.configSchema, effectiveConfig)`** in `config-validation.utils.ts`.
- **ConfigSchema**: optional `required: string[]` and `properties: Record<string, { type?: 'string' | 'number' | 'boolean' | 'object' }>`.
- Service type’s **configSchema** is stored in **`ServiceTypeEntity.configSchema`** (JSONB). The billing module registers the Hetzner provider with **HETZNER_CONFIG_SCHEMA** (required: serverType, location, service; properties for service (enum: controller, manager), serverType, location, firewallId, authenticationMethod, staticApiKey, disableSignup, smtp, keycloak, hetznerApiToken, digitaloceanApiToken).

**Provider/Service type concepts:**

- **ServiceTypeEntity**: id, key, name, description, provider (e.g. 'hetzner'), configSchema, isActive.
- **ServicePlanEntity**: id, serviceTypeId, name, billing fields, **providerConfigDefaults** (JSONB) — default region, serverType, etc.
- **ProviderDetailDto** (`src/lib/dto/provider-detail.dto.ts`): id, displayName, configSchema? — returned by `GET /service-types/providers`.
- **ProviderRegistryService**: register(detail), getProviders(). BillingModule registers `hetzner` with HETZNER_CONFIG_SCHEMA on init.
- **Flavor / server type**: No separate "flavor" entity. Server type is a config field. **ProviderServerTypesService** / **GET service-types/providers/:providerId/server-types** return **ServerTypeDto[]** (id, name, cores, memory, disk, priceMonthly, priceHourly, description) for the provider. Plans can use **basePriceFromField: 'serverType'** so the UI gets options and price from this API.

---

### 1.5 Where to add "Service" (Controller/Manager) and conditional fields

**Service type = which stack runs (Controller vs Manager):**

- Today there is a single cloud-init implementation: **agent-controller** (Agent Controller stack: backend + frontend + nginx + postgres). There is no separate "Manager" service type in the codebase yet.
- **Where to add Service (Controller/Manager):**
  - **Service type level:** Add a field on **ServiceTypeEntity** (e.g. `serviceKind: 'controller' | 'manager'` or `key`: 'agent-controller' | 'agent-manager') so each service type identifies which stack it is.
  - **Cloud-init:** Either:
    - Add a **separate** cloud-init builder module for Manager (e.g. `agent-manager.utils.ts`) and in **SubscriptionService** / **BackorderService** choose the builder by service type (e.g. by `serviceType.key` or new field), or
    - Keep one builder that accepts a "flavor" and branches internally (less clean if the two stacks differ a lot).
  - **Provisioning:** No change needed for Hetzner (same server creation); only userData content changes by service type.

**Conditional instance config fields:**

- **Backend:** effectiveConfig is already a generic object; new fields (e.g. Manager-only options) can be added to the plan’s configSchema and/or providerConfigDefaults. Validate via the same `validateConfigSchema(serviceType.configSchema, effectiveConfig)`. In the cloud-init builder for that service type, read only the fields that apply (e.g. if service type is Manager, read manager-specific keys; ignore controller-only keys).
- **Frontend:** The order form is currently fixed to one set of fields (auth, SMTP, provisioning tokens). To make fields conditional on Service (Controller/Manager):
  - **Option A:** When the user selects a **plan**, derive the service type (and thus Controller vs Manager) from the plan. Show/hide sections or entire "Instance configuration" block based on that (e.g. only show Manager-specific fields when plan’s service type is Manager).
  - **Option B:** Add an explicit "Service" or "Product" selector (Controller / Manager) in the order modal that drives which form sections are visible; optionally filter plans by that choice.
- **Where in the frontend:** **`feature-billing-console`** → **`subscriptions.component.ts`** and **`subscriptions.component.html`**. The instance configuration block is inside the order plan modal (select plan → show plan details + "Instance configuration"). Add conditional rendering (e.g. `@if (getSelectedPlan(...)?.serviceTypeKey === 'agent-manager')`) or a dedicated `serviceKind` from the selected plan and show Manager-only fields only when applicable.

---

## 2. Frontend: framework frontend (billing console)

### 2.1 Order form / subscription creation UI

**Location:**

- **Feature:** `libs/domains/framework/frontend/feature-billing-console`
- **Component:** `src/lib/subscriptions/subscriptions.component.ts` + `subscriptions.component.html`
- **Modal:** "Order plan" modal (`#orderPlanModal`), opened by "Order" button or `?order=true` in the URL.

**Flow:**

1. User clicks "Order" or lands with `?order=true` → `openOrderPlanModal()`.
2. User selects a **Plan** from a dropdown (plans from `ServicePlansFacade.getActiveServicePlans$()`).
3. For the selected plan, the template shows description, price, runtime, min commitment, notice period, and the **Instance configuration** form.
4. User fills instance config (auth method, disable signup, optional SMTP, optional Keycloak, optional provisioning tokens), optionally checks "Backorder if unavailable", accepts legal, and submits.
5. **`onSubmitOrderPlan()`** builds `requestedConfig` from `orderRequestedConfig`, then calls **`subscriptionsFacade.createSubscription(dto)`** with `CreateSubscriptionDto` (planId, requestedConfig, autoBackorder).

**State / facades:**

- **SubscriptionsFacade** (`data-access-billing-console`): createSubscription(dto) dispatches `createSubscription({ subscription })`; effect calls **SubscriptionsService.createSubscription(subscription)** (HTTP POST).
- **ServicePlansFacade**: load and list active plans.
- **BackordersFacade**: list/retry/cancel backorders.

---

### 2.2 Instance configuration form (fields)

**Section:** "Instance configuration" inside the order plan modal (shown when a plan is selected).

**Fields (hierarchy):**

- **Service** (mandatory select): **Controller** | **Manager**. Drives which cloud-init stack and which fields are shown.
- **Authentication method:** Controller — `users` | `api-key` | `keycloak`; Manager — `api-key` | `keycloak` only. **users:** "Disable signup" (Controller only). **api-key:** Static API Key. **keycloak:** Keycloak section.
- **SMTP (optional):** host, port, user, password, from.
- **Provisioning (optional)** (Controller only): Hetzner API token, DigitalOcean API token.

**Binding:**

- All bound to **`orderRequestedConfig`** in `subscriptions.component.ts` (typed object with **service**, authenticationMethod, staticApiKey, disableSignup, smtp, keycloak, hetznerApiToken, digitaloceanApiToken).
- **`authMethod`** signal is kept in sync with `orderRequestedConfig.authenticationMethod` for conditional display (`[ngSwitch]="authMethod()"`).

**No provider/region/serverType in this form:**  
Region and server type are currently coming from **plan defaults** (providerConfigDefaults), not from the order form. The UI does not expose region/serverType selectors in the subscription order modal; they could be added if the API and configSchema support them (e.g. from GET service-types/providers/:id/server-types and location enum).

---

### 2.3 How provider/instance config is sent to the backend

**From order submit:**

1. **`onSubmitOrderPlan()`** builds a plain object **`requestedConfig: Record<string, unknown>`**:
   - Always: **service**, authenticationMethod, smtp. Controller only: disableSignup. If api-key: staticApiKey. If keycloak: keycloak. Controller only and non-empty: hetznerApiToken, digitaloceanApiToken.
2. **DTO:** `{ planId: orderPlanId.trim(), requestedConfig, autoBackorder: orderAutoBackorder }`.
3. **SubscriptionsFacade.createSubscription(dto)** → **SubscriptionsService.createSubscription(subscription)** → **HTTP POST** `environment.billing.restApiUrl + '/subscriptions'` with that body.

**Backend:**  
Receives CreateSubscriptionDto; merges requestedConfig with plan.providerConfigDefaults → effectiveConfig; validates and provisions as above. So provider/instance config reaches the backend as **requestedConfig** and is merged with plan defaults there; the frontend does not send region/serverType in the current order form (they come from the plan’s providerConfigDefaults).

---

## 3. Summary: file paths and references

**Order flow:**

- **Backend:** `dto/create-subscription.dto.ts` → `controllers/subscriptions.controller.ts` → `services/subscription.service.ts` (createSubscription) → `repositories/subscriptions.repository.ts` + `subscription-items.repository.ts` → `services/provisioning.service.ts` + `services/hetzner-provisioning.service.ts`.
- **Frontend:** `feature-billing-console/.../subscriptions.component.ts` (openOrderPlanModal, onSubmitOrderPlan) → `data-access-billing-console` (SubscriptionsFacade, SubscriptionsService) → POST `/subscriptions`.

**userData / cloud-init:**

- **Build:** `utils/cloud-init/agent-controller.utils.ts`: `buildAgentControllerCloudInitConfigFromRequest`, `buildAgentControllerCloudInitUserData`.
- **Consumption:** `subscription.service.ts`, `backorder.service.ts` (when provider === 'hetzner').
- **Env formatting:** `utils/cloud-init/env.utils.ts`: `formatEnvLines` (formatEnv used in agent-controller.utils should match or alias this).

**Instance configuration structure:**

- **effectiveConfig** = plan.providerConfigDefaults + requestedConfig; stored on subscription_item as configSnapshot.
- **Fields:** **service** (controller | manager), authenticationMethod, disableSignup, staticApiKey, smtp (host, port, user, password, from), keycloak (serverUrl, authServerUrl, realm, clientId, clientSecret), hetznerApiToken, digitaloceanApiToken; plus provider fields (region, serverType, firewallId) from plan defaults or future UI.

**Where to add Service (Controller/Manager) and conditional fields:**

- **Implemented:** Backend branches on effectiveConfig.service to use agent-manager.utils or agent-controller.utils; HETZNER_CONFIG_SCHEMA requires service. Frontend: mandatory Service dropdown and conditional sections.
- **Frontend:** Implemented in Subscriptions component order modal (Service dropdown and conditional sections).

**OpenAPI:**  
`spec/openapi.yaml`: RequestedConfig, CreateSubscriptionDto, and subscription/backorder endpoints document the API contract.

---

## 4. Implementation summary (Service Controller/Manager)

Steps performed to implement the Service (Controller/Manager) flavor and conditional fields:

1. **Cloud-init relinking** — In `agent-controller.utils.ts`: added `import { formatEnvLines as formatEnv } from './env.utils'`; added export aliases `buildBillingCloudInitUserData`, `buildCloudInitConfigFromRequest`, and type `CloudInitConfig`.
2. **Agent-manager cloud-init** — Created `agent-manager.utils.ts` with `AgentManagerCloudInitConfig`, `buildAgentManagerCloudInitConfigFromRequest`, and `buildAgentManagerCloudInitUserData`; manager supports only api-key/keycloak auth, no disableSignup, no provisioning tokens; uses `formatEnvLines` from `env.utils.ts`. Added `agent-manager.utils.spec.ts`.
3. **Backend branching** — In `subscription.service.ts` and `backorder.service.ts`: read `effectiveConfig.service`; if `'manager'` use agent-manager utils, else use agent-controller utils; if manager and `authenticationMethod === 'users'` coerce to `'api-key'`.
4. **Schema and OpenAPI** — Added `service` to `HETZNER_CONFIG_SCHEMA` (required, enum: controller, manager); added `service` to RequestedConfig in `spec/openapi.yaml` with description.
5. **Frontend** — In subscriptions component: added mandatory Service select (Controller / Manager) above Authentication method; conditional fields: Controller shows users, Disable signup, SMTP, Provisioning; Manager shows only api-key/keycloak, SMTP; `onServiceChange` coerces auth to api-key when switching to Manager; submit includes `service` and omits disableSignup/provisioning for Manager.
6. **Types** — Added `service` to `RequestedConfigCloudInit` in `billing.types.ts`.
7. **Tests** — Updated `agent-controller.utils.spec.ts` (websocketNamespace, nginx assertions); added `agent-manager.utils.spec.ts`; fixed mock paths in `subscription.service.spec.ts` and `backorder.service.spec.ts`; added manager-path test in subscription.service.spec.
8. **Docs** — Updated this document and summary; sequence diagram note below.
