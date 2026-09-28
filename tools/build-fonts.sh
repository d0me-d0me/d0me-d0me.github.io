#!/usr/bin/env bash
# Regenerate the self-hosted web fonts under assets/fonts/ from @fontsource.
#
# Rationale: the site loads no third-party font CDN (privacy — visitor
# requests never reach fonts.googleapis.com / fonts.gstatic.com — and
# resilience). Fonts are vendored as woff2 (all evergreen browsers support
# it) with the fontsource-generated @font-face CSS concatenated into one
# stylesheet, assets/fonts/fonts.css.
#
# The Japanese family (Zen Kaku Gothic New) uses fontsource's consolidated
# "japanese" subset: one woff2 per weight covering the full JIS glyph set, so
# new Japanese content never renders tofu. Latin families ship latin +
# latin-ext.
#
# Usage:  bash tools/build-fonts.sh
# Requires: npm (to fetch @fontsource packages into a temp dir).

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DST="$REPO/assets/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Installing @fontsource packages into $WORK ..."
cd "$WORK"
npm init -y >/dev/null 2>&1
npm install \
  @fontsource/jetbrains-mono@5 \
  @fontsource/zen-kaku-gothic-new@5 \
  @fontsource/lato@5 \
  @fontsource/source-sans-pro@5 >/dev/null 2>&1

FW="$WORK/node_modules/@fontsource"
rm -rf "$DST/files"
mkdir -p "$DST/files"

OUT="$DST/fonts.css"
cat > "$OUT" <<'HDR'
/*
 * Self-hosted web fonts (fontsource, woff2 only) — no third-party CDN.
 * Privacy: visitor requests never reach fonts.googleapis.com / fonts.gstatic.com.
 * Families: JetBrains Mono, Lato, Source Sans Pro (latin + latin-ext),
 *           Zen Kaku Gothic New (japanese + latin).
 * Regenerate: see tools/build-fonts.sh
 */
HDR

emit() {
  local fam="$1"; shift
  for spec in "$@"; do
    local subset="${spec%%:*}"; local weights="${spec#*:}"
    for w in $weights; do
      cp "$FW/$fam/files/$fam-$subset-$w-normal.woff2" "$DST/files/"
      sed -E "s#, url\(\./files/[^)]+\.woff\) format\('woff'\)##" \
        "$FW/$fam/$subset-$w.css" >> "$OUT"
      printf '\n' >> "$OUT"
    done
  done
}

emit jetbrains-mono      "latin:400 500 700" "latin-ext:400 500 700"
emit lato                "latin:300 400"     "latin-ext:300 400"
emit source-sans-pro     "latin:400 600 700 900" "latin-ext:400 600 700 900"
emit zen-kaku-gothic-new "japanese:400 500 700"  "latin:400 500 700"

echo "Wrote $(grep -c '@font-face' "$OUT") @font-face rules to $OUT"
echo "Vendored $(ls "$DST/files" | wc -l) woff2 files ($(du -sh "$DST/files" | cut -f1))"
