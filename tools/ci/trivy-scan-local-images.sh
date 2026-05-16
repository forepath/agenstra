#!/usr/bin/env bash
# Scan locally built ghcr.io/forepath/* and registry.forenet.internal/forepath/* images.
# Requires Trivy on PATH (use aquasecurity/setup-trivy or trivy-action in the workflow first).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SARIF_CATEGORY="${TRIVY_SARIF_CATEGORY:-trivy-container-images}"
SARIF_FILE="${TRIVY_SARIF_FILE:-trivy-results-${SARIF_CATEGORY}.sarif}"

IMAGE_REGISTRY_PATTERN='^ghcr\.io/forepath/|^registry\.forenet\.internal/forepath/'

mapfile -t images < <(
  docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null \
    | grep -E "$IMAGE_REGISTRY_PATTERN" \
    | sort -u || true
)

if [ "${#images[@]}" -eq 0 ]; then
  echo "No local ghcr.io/forepath/* or registry.forenet.internal/forepath/* images found; skipping Trivy image scan."
  exit 0
fi

echo "Scanning ${#images[@]} local image(s): ${images[*]}"

if ! command -v trivy >/dev/null 2>&1; then
  echo "trivy is not on PATH; add aquasecurity/setup-trivy before this script." >&2
  exit 1
fi

sarif_parts=()
cleanup_parts=()

cleanup() {
  for part in "${cleanup_parts[@]}"; do
    rm -f "$part"
  done
}
trap cleanup EXIT

for image in "${images[@]}"; do
  echo "Scanning image: $image"

  sarif_part="$(mktemp "${TMPDIR:-/tmp}/trivy-image-XXXXXX.sarif")"
  cleanup_parts+=("$sarif_part")

  # SARIF report (non-blocking exit code so upload can run when findings exist)
  trivy image "$image" \
    --config trivy.yaml \
    --format sarif \
    --output "$sarif_part" \
    --exit-code 0

  sarif_parts+=("$sarif_part")

  # Severity gate (CRITICAL per trivy.yaml) — one image per invocation
  trivy image "$image" \
    --config trivy.yaml \
    --format table
done

if [ "${#sarif_parts[@]}" -eq 1 ]; then
  cp "${sarif_parts[0]}" "$SARIF_FILE"
elif command -v jq >/dev/null 2>&1; then
  jq -s '{version: .[0].version, "$schema": .[0]["$schema"], runs: [.[].runs[]]}' "${sarif_parts[@]}" >"$SARIF_FILE"
else
  echo "warning: jq not found; SARIF contains only the last scanned image" >&2
  last_sarif="${sarif_parts[${#sarif_parts[@]}-1]}"
  cp "$last_sarif" "$SARIF_FILE"
fi

echo "SARIF written to $SARIF_FILE"
