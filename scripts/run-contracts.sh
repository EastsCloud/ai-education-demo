#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE_BIN=${NODE_BIN:-node}

exec "$NODE_BIN" "$ROOT/server/run-contract-suite.mjs"
