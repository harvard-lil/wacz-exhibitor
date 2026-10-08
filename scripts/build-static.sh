#!/usr/bin/env bash
# Builds the player as a static site in OUT_DIR: html/embed at the root,
# beside html/replay-web-page, matching the paths nginx.conf serves.
#
#   ARCHIVE_ORIGINS=<origins> [RELATIVE_SOURCE_ORIGINS=<json>] scripts/build-static.sh OUT_DIR
#
# ARCHIVE_ORIGINS          Space-separated origins the player may read
#                          archives from. They become the connect-src of the
#                          Content-Security-Policy written to _headers (the
#                          format Cloudflare Pages and Netlify read). Without
#                          that header the player would play any archive linked
#                          to it, so the build fails if this is unset.
# RELATIVE_SOURCE_ORIGINS  Optional JSON written to config.js as
#                          relativeSourceOrigins, e.g.
#                          [[".wacz", "https://my-waczs.s3.amazonaws.com"]].
#                          Each origin must be in ARCHIVE_ORIGINS.
#
# Needs jq and perl.
set -euo pipefail

out="${1:?usage: ARCHIVE_ORIGINS=... $0 OUT_DIR}"
: "${ARCHIVE_ORIGINS:?Set ARCHIVE_ORIGINS to the origins the player may read archives from}"
RELATIVE_SOURCE_ORIGINS="${RELATIVE_SOURCE_ORIGINS:-}"
html="$(cd "$(dirname "$0")/../html" && pwd)"

mkdir -p "$out"
cp -R "$html/embed/." "$out/"
cp -R "$html/replay-web-page" "$out/replay-web-page"
rm -f "$out/replay-web-page/.keep"

# Without a top-level 404.html, Cloudflare Pages answers unknown paths with
# index.html, as for a single-page app. ReplayWeb's API requests that arrive
# before its service worker is active must get a 404, as they do from NGINX,
# not an HTML page it tries to parse.
echo "Not found" > "$out/404.html"

{
  echo "/*"
  echo "  Content-Security-Policy: default-src 'self' data: 'unsafe-inline' 'unsafe-hashes' 'unsafe-eval'; connect-src 'self' data: ${ARCHIVE_ORIGINS}"
} > "$out/_headers"

if [ -n "$RELATIVE_SOURCE_ORIGINS" ]; then
  # Every mapped origin has to be readable under the CSP, or relative sources
  # would fail to load.
  for origin in $(jq -r '.[][1]' <<<"$RELATIVE_SOURCE_ORIGINS"); do
    case " ${ARCHIVE_ORIGINS} " in
      *" ${origin} "*) ;;
      *) echo "error: ${origin} is not in ARCHIVE_ORIGINS" >&2; exit 1 ;;
    esac
  done
  ORIGINS_JSON="$(jq -c . <<<"$RELATIVE_SOURCE_ORIGINS")" \
    perl -pi -e 's/^export const relativeSourceOrigins = \[\];$/export const relativeSourceOrigins = $ENV{ORIGINS_JSON};/' "$out/config.js"
  grep -q '^export const relativeSourceOrigins = \[\[' "$out/config.js"
fi

cat "$out/_headers"
grep '^export const relativeSourceOrigins' "$out/config.js"
