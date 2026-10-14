#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE_BIN=${NODE_BIN:-node}
RUN_ID=$(date +%Y%m%d-%H%M%S)

mkdir -p "$ROOT/runtime-data/test-reports"
export AI_EDUCATION_E2E_DATABASE="runtime-data/system-e2e-$RUN_ID.sqlite"
export AI_EDUCATION_E2E_REPORT_DIR="runtime-data/test-reports"

"$NODE_BIN" "$ROOT/server/system-journey-e2e.mjs"
