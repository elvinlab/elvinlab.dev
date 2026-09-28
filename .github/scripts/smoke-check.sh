#!/usr/bin/env bash
# Smoke-checks a deployed site: the page answers 200 with HTML, /version.txt serves the expected
# commit SHA (so the new build is live, not the previous one), and fingerprinted /_astro/ assets
# are served with immutable caching (WebP images with the right content type).
# Usage: smoke-check.sh <base-url> <expected-sha>
set -euo pipefail

base_url="${1:?usage: smoke-check.sh <base-url> <expected-sha>}"
expected_sha="${2:?usage: smoke-check.sh <base-url> <expected-sha>}"

# Retry budget: max_attempts x retry_delay seconds (~2 minutes by default).
max_attempts="${SMOKE_MAX_ATTEMPTS:-12}"
retry_delay="${SMOKE_RETRY_DELAY:-10}"

page="$(mktemp)"
trap 'rm -f "$page"' EXIT

fetch_status() {
  # curl already prints 000 on connection errors; ignore its exit code so the loop can retry.
  curl --silent --output "$2" --write-out '%{http_code}' --max-time 15 "$1" || true
}

# The new build is live: retry until /version.txt serves the expected commit SHA.
actual_sha=""
for attempt in $(seq 1 "$max_attempts"); do
  version_status="$(fetch_status "$base_url/version.txt" "$page")"
  actual_sha="$(tr -d '[:space:]' < "$page")"
  [[ "$version_status" == 200 && "$actual_sha" == "$expected_sha" ]] && break
  echo "attempt $attempt: $base_url/version.txt -> $version_status '${actual_sha:0:12}', waiting for $expected_sha"
  sleep "$retry_delay"
done
[[ "$actual_sha" == "$expected_sha" ]] \
  || { echo "FAIL: version.txt serves '${actual_sha:0:40}', expected $expected_sha after $max_attempts attempts"; exit 1; }
echo "ok: $base_url/version.txt -> $expected_sha"

# Root page.
status=000
for attempt in $(seq 1 "$max_attempts"); do
  status="$(fetch_status "$base_url/" "$page")"
  [[ "$status" == 200 ]] && break
  echo "attempt $attempt: $base_url/ -> $status, retrying in ${retry_delay}s"
  sleep "$retry_delay"
done
[[ "$status" == 200 ]] || { echo "FAIL: $base_url/ returned $status after $max_attempts attempts"; exit 1; }
grep -qi '<html' "$page" || { echo "FAIL: $base_url/ did not return HTML"; exit 1; }
html_content="$(cat "$page")"
echo "ok: $base_url/ -> 200"

# Fingerprinted assets: one of each type present, with retries on transport errors.
checked=0
for ext in webp css js; do
  asset="$(grep -oE "/_astro/[^\"]+\.$ext" <<<"$html_content" | head -n 1 || true)"
  [[ -n "$asset" ]] || continue
  headers=""
  for attempt in $(seq 1 "$max_attempts"); do
    headers="$(curl --silent --head --max-time 15 "$base_url$asset" || true)"
    grep -qiE '^HTTP/[0-9.]+ 200' <<<"$headers" && break
    echo "attempt $attempt: $base_url$asset -> transport error or non-200, retrying in ${retry_delay}s"
    sleep "$retry_delay"
  done
  grep -qiE '^HTTP/[0-9.]+ 200' <<<"$headers" || { echo "FAIL: $asset is not 200 after $max_attempts attempts"; exit 1; }
  grep -qi 'cache-control: public, max-age=31536000, immutable' <<<"$headers" \
    || { echo "FAIL: $asset is not served with immutable caching"; exit 1; }
  if [[ "$ext" == webp ]]; then
    grep -qi 'content-type: image/webp' <<<"$headers" || { echo "FAIL: $asset is not image/webp"; exit 1; }
  fi
  echo "ok: $asset -> 200, immutable cache"
  checked=$((checked + 1))
done
[[ "$checked" -gt 0 ]] || { echo "FAIL: page references no /_astro/ asset"; exit 1; }
