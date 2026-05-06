# Security Policy

## Supported Versions

We provide security updates for the following versions of this framework:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |
| < 0.x   | :x:                |

## Reporting a Vulnerability

We take security seriously and appreciate your help in keeping this framework and its users safe.

### How to Report Security Issues

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to our security team:

- **Email**: soc@forepath.io
- **Subject**: `[SECURITY] Framework Vulnerability Report`
- **Response Time**: We aim to respond within 48 hours

### What to Include in Your Report

When reporting a security vulnerability, please include:

1. **Description** - Clear description of the vulnerability
2. **Impact** - Potential impact and severity assessment
3. **Steps to Reproduce** - Detailed steps to reproduce the issue
4. **Affected Versions** - Which versions of this framework are affected
5. **Suggested Fix** - If you have ideas for how to fix the issue
6. **Contact Information** - How we can reach you for follow-up

### Vulnerability Assessment Process

1. **Initial Response** - We'll acknowledge receipt within 48 hours
2. **Assessment** - Our security team will assess the vulnerability
3. **Investigation** - We'll investigate and validate the issue
4. **Fix Development** - We'll develop and test a fix
5. **Coordination** - We'll coordinate disclosure with you
6. **Release** - We'll release the fix and security advisory

### Recognition

We believe in recognizing security researchers who help keep this framework secure:

- **Hall of Fame** - Security researchers will be recognized in our security acknowledgments
- **Responsible Disclosure** - We follow responsible disclosure practices
- **Collaboration** - We work with researchers to ensure proper fixes

## Security Best Practices

### For Developers

- **Keep Dependencies Updated** - Regularly update all dependencies
- **Follow Security Guidelines** - Adhere to the project’s code quality and security practices
- **Use Secure Coding Practices** - Follow secure coding principles
- **Regular Security Audits** - Perform regular security audits of your code

### For Organizations

- **Security Training** - Ensure your team is trained on security best practices
- **Regular Updates** - Keep this framework and all dependencies up to date
- **Security Monitoring** - Implement security monitoring and alerting
- **Incident Response** - Have an incident response plan in place

## Security Features

This framework includes several built-in security features:

### Built-in Security

- **Dependency Scanning** - Automated vulnerability scanning in CI/CD
- **Security Headers** - Default security headers for web applications
- **Input Validation** - Built-in input validation and sanitization
- **Authentication Patterns** - Secure authentication and authorization patterns

### Security Tools Integration

- **npm audit** - Integrated dependency vulnerability scanning
- **ESLint Security Rules** - Security-focused linting rules
- **Pre-commit Hooks** - Security checks before code commits
- **CI/CD Security Gates** - Automated security validation in pipelines

## Security Resources

## Provisioning SSH posture (documented acceptance)

Some deployment flows in this repository generate **cloud-init** (or equivalent) that configures **SSH access to `root`** (`PermitRootLogin yes`) and installs an **`authorized_keys` entry under `/root/.ssh/`**. This is a **known, documented** deployment property so it is not treated as a silent weakness.

|                                     |                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Residual risk**                   | Anyone who obtains the provisioning SSH private key can obtain **root** on newly provisioned instances that use these templates.                                                                                                                              |
| **Mitigations in generated config** | **Public-key authentication**; **password authentication disabled** for SSH (`PasswordAuthentication no` where the template applies).                                                                                                                         |
| **What deployers should add**       | Network controls (firewall / security groups), bastion or jump hosts, key rotation, least privilege in the rest of the stack, and—when operational constraints allow—migrating to a **non-root** admin user with `PermitRootLogin no` and constrained `sudo`. |

**Risk acceptance (organizational):** acceptance **2026-05-06** by the repository maintainer; **next review 2027-05-06** (or sooner if provisioning templates change). Full threat context and backlog: [`thread-analysis.md`](./thread-analysis.md) (section E and _Accepted risks_ register **AR-001**).

## Software Bill of Materials (SBOM)

We publish CycloneDX SBOM files for each release.

- **Path**: `releases/<version>/sboms/`
- **Example**: `releases/0.1.0/sboms/`
- **How to find your version**: Check the release version in [Downloads](https://downloads.agenstra.com/), then replace `<version>` in the path above.

### Documentation

- [Project overview and docs](./docs/agenstra/README.md) - Architecture, deployment, and setup

## Web frontend Content-Security-Policy (documented acceptance)

The **`frontend-*`** Express servers set a **Content-Security-Policy** that includes **`'unsafe-inline'`** and **`'unsafe-eval'`** in `script-src` (and `'unsafe-inline'` in `style-src`) so **Monaco Editor** and related tooling work. In **frontend-agent-console** this is explicitly called out in code: Monaco and some tooling commonly require eval; the policy is sent as **`Content-Security-Policy-Report-Only`** by default so browsers **report** violations without blocking. Set **`CSP_ENFORCE=true`** only after you have verified the app still functions.

|                        |                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Residual risk**      | A strict CSP baseline would reduce XSS impact; the current policy is **more permissive**; report-only does not enforce.          |
| **Why it is accepted** | Tightening without a validated Monaco/worker strategy risks **breaking core behavior**; Monaco is integral to the agent console. |

**Risk acceptance:** **2026-05-06** by the repository maintainer; **next review 2027-05-06** (or sooner if CSP or Monaco integration changes). Full register: [`thread-analysis.md`](./thread-analysis.md) (_Accepted risks_ **AR-003**, section G).

## Desktop (Agent Console) distribution integrity

Published desktop installers/archives for **native-agent-console** ship with **SHA-256 checksum manifests** so you can confirm files were not corrupted or swapped in transit. This supports **integrity verification** (EU CRA–aligned supply-chain hygiene); it does **not** by itself prove publisher identity—for that, use OS-level code signing where your platform supports it.

### Desktop distribution — signing & update posture (documented acceptance)

**OS-trusted code signing** and an **in-app auto-update** channel are **not** provided at this time. That gap is a **known, documented** product decision: the offering is **primarily meant to be used in the web browser**, and the Electron build is a **secondary** distribution path.

|                          |                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Residual risk**        | Without signing and auto-update, users depend on **manual verification** (`SHA256SUMS` / `integrity-manifest.json`) and a **trusted download source**; tampering or delayed patching is easier than for a signed, auto-updating desktop product. |
| **Mitigations in place** | Published checksum manifests and documented `sha256sum -c` / `shasum -a 256 -c` steps (below).                                                                                                                                                   |

**Risk acceptance:** **2026-05-06** by the repository maintainer; **next review 2027-05-06** (or sooner if native desktop becomes a primary channel or packaging changes). Full register: [`thread-analysis.md`](./thread-analysis.md) (_Accepted risks_ **AR-002**).

### What we publish

After a production `electron-forge make` build, the pipeline writes, next to the artifacts under `out/make/`:

- `SHA256SUMS` — GNU `sha256sum`-compatible text (two spaces between digest and path)
- `integrity-manifest.json` — machine-readable list (`schemaVersion`, `algorithm`, `generatedAt`, `artifacts[]`)

The tool is **`@agenstra/release-integrity`** (`tools/release-integrity`; `nx run release-integrity:build` / `nx run release-integrity:test`).

### How to verify (Linux and similar)

From the directory that contains `SHA256SUMS` and the downloaded files (paths must match the manifest):

```bash
sha256sum -c SHA256SUMS
```

### How to verify (macOS)

```bash
shasum -a 256 -c SHA256SUMS
```

### Release process note

`nx run native-agent-console:package --configuration=production-linux` (or `production-windows`) runs the integrity step automatically after packaging. For ad-hoc paths, set `RELEASE_INTEGRITY_INPUT` (or legacy `DESKTOP_RELEASE_INTEGRITY_INPUT`) or pass `--input <dir>` to `node tools/release-integrity/dist/src/cli.js`.

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Common security risks
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) - Cybersecurity best practices
- [GitHub Security Advisories](https://github.com/advisories) - Security vulnerability database

## Incident Response

### If You Discover a Security Issue

1. **Do NOT** create a public issue or discussion
2. **Do NOT** share details on social media or public forums
3. **Do** email soc@forepath.io immediately
4. **Do** provide as much detail as possible
5. **Do** allow us time to investigate and fix the issue

### Our Response Commitment

- **48-hour acknowledgment** of security reports
- **Regular updates** on investigation progress
- **Coordinated disclosure** with security researchers
- **Timely fixes** for confirmed vulnerabilities
- **Public acknowledgment** of security researchers

## Contact Information

### Security Team

- **Security Issues**: soc@forepath.io
- **General Questions**: hi@forepath.io
- **Emergency Contact**: Available 24/7 for critical security issues

### Response Times

- **Critical Issues**: 24 hours
- **High Priority**: 48 hours
- **Medium Priority**: 1 week
- **Low Priority**: 2 weeks

## Thank You

Thank you for helping keep this framework and its users secure. Your responsible disclosure helps us maintain the highest security standards and protects the entire community.

---

**Remember**: Security is everyone's responsibility. Together, we can build and maintain secure software that protects users and their data.

_Last updated: January 2025_
