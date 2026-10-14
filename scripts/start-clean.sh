#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE_BIN=${NODE_BIN:-node}
PORT=${PORT:-4176}
DATABASE_PATH=${AI_EDUCATION_DATABASE_PATH:-"$ROOT/runtime-data/ai-education-clean.sqlite"}

mkdir -p "$(dirname -- "$DATABASE_PATH")"
export PORT
export AI_EDUCATION_DATABASE_PATH="$DATABASE_PATH"

echo "Starting AI Education at http://127.0.0.1:$PORT"
echo "Database: $DATABASE_PATH"
exec "$NODE_BIN" "$ROOT/server/dev-server.mjs"
