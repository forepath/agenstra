# util-http-context (frontend)

Shared **Express** helpers for Angular SSR static hosts and SPA file servers, plus **`EXPRESS_TRUST_PROXY`** parsing consumed by **`@forepath/framework/backend/util-http-context`** (Nest bootstrap). Not part of **`libs/domains/shared`**.

## Trust proxy (low-level)

`applyExpressTrustProxy` / `applyExpressTrustProxyAsync`, `parseExpressTrustProxyFromEnv`, etc. — implemented in **`@forepath/shared/shared/util-express-trust-proxy`** and re-exported here.

## Express hardening (frontends)

Use **`applyExpressServerHardeningAsync`** at startup (recommended) so `trust proxy` can include **hostnames** resolved via DNS. **`applyExpressServerHardening`** is for values without hostnames only.

- **`app.disable('x-powered-by')`** so responses do not advertise Express.
- Optional **`trust proxy`**, aligned with the [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html) guide (see also the [German page](https://expressjs.com/de/guide/behind-proxies.html)).

### Environment: `EXPRESS_TRUST_PROXY`

| Value                      | Effect                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| _(unset)_                  | No `trust proxy` (Express default).                                                                        |
| `true`, `1`, `yes`         | Trust **one** proxy hop (`1`).                                                                             |
| `false`, `0`, `no`         | Same as unset.                                                                                             |
| All digits, e.g. `2`       | Hop count `n` (Express number semantics).                                                                  |
| Comma-separated trust list | IPs, CIDR, netmask, named subnets (`loopback`, `linklocal`, `uniquelocal`), or hostnames (async API only). |

Express uses [proxy-addr](https://www.npmjs.com/package/proxy-addr); hostnames are resolved before `app.set('trust proxy', …)`.

**Caveats:** One resolved IP per hostname (`dns.promises.lookup`). **`EXPRESS_TRUST_PROXY=true`** maps to hop count `1`, not Express boolean `true`; use `{ trustProxy: true }` in code only with a trusted edge that strips spoofable forwarded headers.

## Security headers

**`createSecurityHeadersMiddleware`** — CSP (report-only unless `CSP_ENFORCE=true`), `X-Content-Type-Options`, `Referrer-Policy`, etc. Use after hardening.

## Runtime config route

**`registerRuntimeConfigEndpoint`** mounts **`GET /config`** (see `@forepath/framework/frontend/util-runtime-config-server`).
