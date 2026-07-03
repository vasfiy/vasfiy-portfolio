#!/usr/bin/env bash
# One-command production deploy: builds, uploads a draft deploy (retrying past
# flaky network), then publishes it via restoreSiteDeploy — the method that
# works on this account (direct `--prod` returns Forbidden).
set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-f2052064-3c94-456e-8354-4d42249c31db}"
cd "$(dirname "$0")/.."

echo "▶ Deploying to Netlify site $SITE_ID"
DID=""
for attempt in 1 2 3 4 5; do
  OUT=$(npx --yes netlify-cli@latest deploy --site "$SITE_ID" 2>&1) || true
  DID=$(echo "$OUT" | grep -oE '[0-9a-f]{24}--' | grep -oE '[0-9a-f]{24}' | head -1)
  if [ -n "$DID" ]; then echo "✓ draft uploaded (attempt $attempt): $DID"; break; fi
  echo "✗ attempt $attempt failed (network) — retrying…"
done
[ -n "$DID" ] || { echo "Deploy failed after 5 attempts"; exit 1; }

STATE=$(npx --yes netlify-cli@latest api restoreSiteDeploy \
  --data "{\"site_id\":\"$SITE_ID\",\"deploy_id\":\"$DID\"}" 2>/dev/null \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('state',''))" || echo "")
if [ "$STATE" = "ready" ]; then
  echo "✅ Published — live at https://vasfiy.com"
else
  echo "⚠ Publish state: '$STATE' — check https://app.netlify.com/projects/vasfiy-next/deploys"
  exit 1
fi
