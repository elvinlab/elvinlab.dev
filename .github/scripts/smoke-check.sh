#!/usr/bin/env bash
# Smoke-checks a deployed site: the page answers 200 with HTML, and fingerprinted /_astro/ assets
# are served with immutable caching (WebP images with the right content type).
# Usage: smoke-check.sh <base-url>
set -euo pipefail

base_url="${1:?usage: smoke-check.sh <base-url>}"
page="$(mktemp)"
trap 'rm -f "$page"' EXIT

fetch_status() {
  curl --silent --output "$2" --write-out '%{http_code}' --max-time 15 "$1" || echo 000
}

status=000
for attempt in $(seq 1 12); do
  status="$(fetch_status "$base_url/" "$page")"
  [[ "$status" == 200 ]] && break
  echo "attempt $attempt: $base_url/ -> $status, retrying"
  sleep 10
done
[[ "$status" == 200 ]] || { echo "FAIL: $base_url/ returned $status"; exit 1; }
grep -qi '<html' "$page" || { echo "FAIL: $base_url/ did not return HTML"; exit 1; }
echo "ok: $base_url/ -> 200"

checked=0
for ext in webp css js; do
  asset="$(grep -oE "/_astro/[^\"]+\.$ext" "$page" | head -n 1 || true)"
  [[ -n "$asset" ]] || continue
  headers="$(curl --silent --head --max-time 15 "$base_url$asset")"
  grep -qiE '^HTTP/[0-9.]+ 200' <<<"$headers" || { echo "FAIL: $asset is not 200"; exit 1; }
  grep -qi 'cache-control: public, max-age=31536000, immutable' <<<"$headers" \
    || { echo "FAIL: $asset is not served with immutable caching"; exit 1; }
  if [[ "$ext" == webp ]]; then
    grep -qi 'content-type: image/webp' <<<"$headers" || { echo "FAIL: $asset is not image/webp"; exit 1; }
  fi
  echo "ok: $asset -> 200, immutable cache"
  checked=$((checked + 1))
done
[[ "$checked" -gt 0 ]] || echo "ok: no /_astro/ assets referenced"
