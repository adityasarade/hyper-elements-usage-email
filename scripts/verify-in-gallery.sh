#!/usr/bin/env bash
# Checks this template inside the official Hyper Elements templates folder, as the gallery's own tests do: its example
# and both designs, in all nine sample brands. Clones github.com/hyper-elements/hyper-elements into a temporary folder
# (or the folder given), copies community-template/ into its templates/, builds the packages and runs the tests.
#
#   bash scripts/verify-in-gallery.sh [folder]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
work="${1:-$(mktemp -d)}"
git clone --depth 1 https://github.com/hyper-elements/hyper-elements.git "$work/hyper-elements"
cp -R "$here/community-template/." "$work/hyper-elements/templates/"
cd "$work/hyper-elements"
npx -y pnpm@9.7.0 install --frozen-lockfile
npx -y pnpm@9.7.0 build
cd templates
npx -y pnpm@9.7.0 exec vitest run -t "emails/usage-report"
npx -y pnpm@9.7.0 typecheck
