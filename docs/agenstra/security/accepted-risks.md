# Accepted risks (register)

This register records **explicit risk acceptance** for product and deployment constraints that deviate from strict security baselines. It supports **BSI / ISMS-style** traceability and **CRA-aligned** technical documentation. For vulnerability reporting, SBOM paths, and desktop checksum verification, see **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**.

**Review cadence:** entries use acceptance **2026-05-06** and next review **2027-05-06** unless a row states otherwise; trigger an early review if the relevant templates, packaging, or CSP integration change materially.

---

## AR-001 — Cloud-init root SSH

| Field                                             | Recorded value                                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                                            | AR-001                                                                                                                                                                                |
| **Configuration**                                 | SSH **`PermitRootLogin yes`**; provisioning installs **`authorized_keys` for `root`** (e.g. `echo … > /root/.ssh/authorized_keys` in cloud-init).                                     |
| **Residual risk**                                 | Compromise of the provisioning SSH private key (or metadata/user-data leakage) can yield **root** on affected instances.                                                              |
| **Mitigations in scope of this repo (templates)** | **Key-based** SSH; **`PasswordAuthentication no`** in generated SSH config.                                                                                                           |
| **Compensating controls (deployer / org)**        | Network restriction (security groups, allowlisted IPs, bastion), key rotation, monitoring, minimizing secrets in user-data, instance hardening beyond templates.                      |
| **Risk owner**                                    | Maintaining party for this repository / product security documentation (Forepath).                                                                                                    |
| **Acceptor**                                      | Repository maintainer (personal acceptance recorded in project documentation).                                                                                                        |
| **Acceptance date**                               | **2026-05-06**                                                                                                                                                                        |
| **Next review date**                              | **2027-05-06**                                                                                                                                                                        |
| **Rationale (business / technical)**              | Provisioning templates prioritize operational simplicity of first-boot automation. Non-root SSH and `PermitRootLogin no` remain the documented hardening path when constraints allow. |

#### Operator summary (AR-001)

Some deployment flows generate cloud-init that configures **SSH to `root`** and installs **`authorized_keys` under `/root/.ssh/`**. This is a **known, documented** property. **Residual risk:** anyone with the provisioning private key can obtain **root** on affected instances. **Mitigations in templates:** key-based auth; password authentication disabled for SSH. Deployers should add network controls, bastions, key rotation, and—when possible—non-root admin with `PermitRootLogin no`.

---

## AR-002 — Desktop: no OS-trusted code signing / no in-app auto-update

| Field                                | Recorded value                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                               | AR-002                                                                                                                                                                                                               |
| **Scope**                            | **native-agent-console** (Electron): **no** OS-trusted **code signing** and **no** **in-app auto-update** channel. **Mitigations:** **`SHA256SUMS`** and **`integrity-manifest.json`** with documented verification. |
| **Residual risk**                    | Users rely on **manual checksum verification** and a trusted download channel rather than OS trust stores or automatic updates.                                                                                      |
| **Rationale (business / technical)** | The product is **primarily** used via the **web browser**; the Electron build is **secondary**.                                                                                                                      |
| **Risk owner**                       | Maintaining party for this repository / product security documentation (Forepath).                                                                                                                                   |
| **Acceptor**                         | Repository maintainer (personal acceptance recorded in project documentation).                                                                                                                                       |
| **Acceptance date**                  | **2026-05-06**                                                                                                                                                                                                       |
| **Next review date**                 | **2027-05-06**                                                                                                                                                                                                       |

#### Operator summary (AR-002)

**OS-trusted code signing** and **in-app auto-update** are **not** provided. Users should verify artifacts using **`SHA256SUMS`** / **`integrity-manifest.json`** and a trusted download source. Details: **[Desktop release integrity](./vulnerability-reporting-and-artifacts.md#desktop-release-integrity)**.

---

## AR-003 — Frontend CSP: `unsafe-inline` / `unsafe-eval` for Monaco and tooling

| Field                                | Recorded value                                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                               | AR-003                                                                                                                                                                                                                                                                      |
| **Scope**                            | **`frontend-*`** Express servers: CSP includes **`script-src 'self' 'unsafe-inline' 'unsafe-eval'`** and **`style-src 'self' 'unsafe-inline'`** for **Monaco Editor** and tooling. Default header: **`Content-Security-Policy-Report-Only`** unless **`CSP_ENFORCE=true`**. |
| **Residual risk**                    | XSS impact is larger than under a strict CSP; report-only does not block violations.                                                                                                                                                                                        |
| **Rationale (business / technical)** | Monaco is **core** to the agent console; tightening without a validated worker/nonce strategy risks **breaking** the product. Enforcement is **opt-in** after verification.                                                                                                 |
| **Risk owner**                       | Maintaining party for this repository / product security documentation (Forepath).                                                                                                                                                                                          |
| **Acceptor**                         | Repository maintainer (personal acceptance recorded in project documentation).                                                                                                                                                                                              |
| **Acceptance date**                  | **2026-05-06**                                                                                                                                                                                                                                                              |
| **Next review date**                 | **2027-05-06**                                                                                                                                                                                                                                                              |

#### Operator summary (AR-003)

**`frontend-*`** servers send a CSP that allows **`unsafe-inline`** and **`unsafe-eval`** so Monaco and tooling work. By default the header is **`Content-Security-Policy-Report-Only`**. Set **`CSP_ENFORCE=true`** only after verifying the app. See **[Operational hardening — Content Security Policy](./operational-hardening.md#content-security-policy-frontend-express)** and **[Environment configuration — CSP](../deployment/environment-configuration.md#content-security-policy-express)**.

---

## Related documentation

- **[Compliance and standards](./compliance-and-standards.md)**
- **[Operational hardening](./operational-hardening.md)**
- **[Vulnerability reporting and artifacts](./vulnerability-reporting-and-artifacts.md)**

---

_Update this register when acceptance is renewed or withdrawn._
