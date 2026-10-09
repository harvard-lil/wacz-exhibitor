#!/usr/bin/env bash
# Builds the player as a static site in OUT_DIR:
#
#   index.html                      the embed page, at the URL sites embed
#   404.html, _headers
#   <build>/index.js, config.js     loaded by index.html
#   <build>/replay-web-page/        ReplayWeb.page: ui.js, sw.js, index.html
#
# <build> is a hash of the files under it, so each different build is served
# from paths no browser has cached and its service worker gets a scope of its
# own; an identical build keeps the same paths. index.html itself is not
# versioned: it is the URL embedders use. NGINX serves html/ unchanged, with
# the ReplayWeb files at /replay-web-page/.
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
# Needs jq, perl and sha256sum.
set -euo pipefail

out="${1:?usage: ARCHIVE_ORIGINS=... $0 OUT_DIR}"
: "${ARCHIVE_ORIGINS:?Set ARCHIVE_ORIGINS to the origins the player may read archives from}"
RELATIVE_SOURCE_ORIGINS="${RELATIVE_SOURCE_ORIGINS:-}"
html="$(cd "$(dirname "$0")/../html" && pwd)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Assemble the versioned files, with this deployment's settings, before hashing
# them, so a settings change also gets new paths.
mkdir -p "$work/build"
cp "$html/embed/index.js" "$html/embed/config.js" "$work/build/"
cp -R "$html/replay-web-page" "$work/build/replay-web-page"
rm -f "$work/build/replay-web-page/.keep"

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
    perl -pi -e 's/^export const relativeSourceOrigins = \[\];$/export const relativeSourceOrigins = $ENV{ORIGINS_JSON};/' "$work/build/config.js"
  grep -q '^export const relativeSourceOrigins = \[\[' "$work/build/config.js"
fi

build="$(cd "$work/build" \
  && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum \
  | sha256sum | cut -c1-12)"

BASE="/${build}/replay-web-page/" \
  perl -pi -e 's|^export const replayBase = "/replay-web-page/";$|export const replayBase = "$ENV{BASE}";|' "$work/build/config.js"
grep -q "^export const replayBase = \"/${build}/replay-web-page/\";$" "$work/build/config.js"

mkdir -p "$out"
cp -R "$work/build" "$out/$build"

BUILD="$build" perl -p \
  -e 's|src="/replay-web-page/ui.js"|src="/$ENV{BUILD}/replay-web-page/ui.js"|;' \
  -e 's|src="/index.js"|src="/$ENV{BUILD}/index.js"|;' \
  "$html/embed/index.html" > "$out/index.html"
grep -q "src=\"/${build}/replay-web-page/ui.js\"" "$out/index.html"
grep -q "src=\"/${build}/index.js\"" "$out/index.html"

# Without a top-level 404.html, Cloudflare Pages answers unknown paths with
# index.html, as for a single-page app. ReplayWeb's API requests that arrive
# before its service worker is active must get a 404, as they do from NGINX,
# not an HTML page it tries to parse.
echo "Not found" > "$out/404.html"

{
  echo "/*"
  echo "  Content-Security-Policy: default-src 'self' data: 'unsafe-inline' 'unsafe-hashes' 'unsafe-eval'; connect-src 'self' data: ${ARCHIVE_ORIGINS}"
} > "$out/_headers"

echo "build ${build}"
cat "$out/_headers"
grep -E '^export const (relativeSourceOrigins|replayBase)' "$out/$build/config.js"
