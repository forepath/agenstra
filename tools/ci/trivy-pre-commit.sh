#!/usr/bin/env bash
# Pre-commit Trivy gate: filesystem + config scans using repo trivy.yaml (CRITICAL fail).
# Container image scans are CI-only (see tools/ci/trivy-scan-local-images.sh).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if ! command -v trivy >/dev/null 2>&1; then
  echo "❌ Trivy is not installed or not on PATH."
  echo "   Install: https://trivy.dev/latest/docs/installation/"
  echo "   Then re-run your commit."
  exit 1
fi

echo "🔒 Running Trivy filesystem scan (vuln, secret, misconfig)..."
trivy fs . --config trivy.yaml --quiet

echo "🔒 Running Trivy config scan (Dockerfiles, IaC, workflows)..."
trivy config . --config trivy.yaml --quiet

echo "✅ Trivy pre-commit scans passed."
