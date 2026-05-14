# util-http-context

Correlation IDs, request logging, Socket.IO adapter wiring, and **Nest HTTP hardening** (`nest-http-hardening.ts`): Express **`EXPRESS_TRUST_PROXY`**, **`X-Powered-By`** off, and baseline API security headers. Trust parsing uses **`@forepath/shared/shared/util-express-trust-proxy`** (also re-exported from **`@forepath/framework/frontend/util-http-context`** for frontends). Angular Express servers use the frontend package for CSP, `/config`, and hardening.

## Running unit tests

Run `nx run framework-backend-util-http-context:test` to execute unit tests via [Jest](https://jestjs.io).
