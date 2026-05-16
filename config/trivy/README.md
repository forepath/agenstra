# Trivy configuration

Repository-wide scanner defaults live in [`trivy.yaml`](../../trivy.yaml) at the repo root. CI and local runs should use that file.

## Local scans

Install [Trivy](https://trivy.dev/) and run from the repository root:

```bash
trivy fs . --config trivy.yaml
trivy config . --config trivy.yaml
trivy image ghcr.io/forepath/agenstra-manager-api:latest --config trivy.yaml
```

After building container images locally (tags under `ghcr.io/forepath/*` or `registry.forenet.internal/forepath/*`):

```bash
./tools/ci/trivy-scan-local-images.sh
```

## Pre-commit hook

The [`.husky/pre-commit`](../../.husky/pre-commit) hook runs the same **filesystem** and **config** scans as pull-request CI (via [`tools/ci/trivy-pre-commit.sh`](../../tools/ci/trivy-pre-commit.sh)). **Container image scans** run in pull-request CI and via [`trivy-scan-local-images.sh`](../../tools/ci/trivy-scan-local-images.sh) for local builds—not on the release workflow.

Install [Trivy](https://trivy.dev/latest/docs/installation/) before your first commit on a machine; commits fail if `trivy` is not on `PATH`.

To run the gate manually:

```bash
./tools/ci/trivy-pre-commit.sh
```

To skip all Husky hooks for a single commit (use sparingly): `git commit --no-verify`.

## Policy

| Setting               | Value                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fail severity         | CRITICAL                                                                                                                                                                                                |
| Unfixed CVEs          | Ignored (`vulnerability.ignore-unfixed: true` — no Fixed Version); accepted risk **[AR-006](../../docs/agenstra/security/accepted-risks.md#ar-006--ci--local-trivy-unfixed-vulnerabilities-not-gated)** |
| Scanners (filesystem) | vuln, secret, misconfig                                                                                                                                                                                 |

## Ignoring findings

Do **not** weaken [`trivy.yaml`](../../trivy.yaml) for one-off exceptions. Use [`.trivyignore`](../../.trivyignore) instead:

1. Open a PR that adds the CVE ID to `.trivyignore`.
2. Reference an **[accepted-risk](../../docs/agenstra/security/accepted-risks.md)** entry or document why the finding is a false positive.
3. Include a **review/expiry date** in the PR description.

## CI integration

See **[CI security scanning](../../docs/agenstra/security/ci-security-scanning.md)** for workflow behavior, SARIF upload, and triage.

## Related documentation

- [`SECURITY.md`](../../SECURITY.md)
- [`docs/agenstra/security/`](../../docs/agenstra/security/)
