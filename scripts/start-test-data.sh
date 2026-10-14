#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE_BIN=${NODE_BIN:-node}
PORT=${PORT:-4177}
SOURCE_DATABASE=${AI_EDUCATION_TEST_SNAPSHOT:-"$ROOT/test-data/system-e2e-final.sqlite"}
DATABASE_PATH=${AI_EDUCATION_DATABASE_PATH:-"$ROOT/runtime-data/system-e2e-it-review.sqlite"}

if [ ! -f "$SOURCE_DATABASE" ]; then
  echo "Missing test snapshot: $SOURCE_DATABASE" >&2
  echo "Git does not include the archived SQLite snapshot. Use npm start for a local development DB, or npm run test:e2e to generate a fresh five-learner cohort." >&2
  exit 1
fi

mkdir -p "$(dirname -- "$DATABASE_PATH")"
if [ ! -f "$DATABASE_PATH" ] || [ "${RESET_TEST_DATA:-0}" = "1" ]; then
  cp "$SOURCE_DATABASE" "$DATABASE_PATH"
fi

export PORT
export AI_EDUCATION_DATABASE_PATH="$DATABASE_PATH"

echo "Starting AI Education test snapshot at http://127.0.0.1:$PORT"
echo "Working database: $DATABASE_PATH"
exec "$NODE_BIN" "$ROOT/server/dev-server.mjs"
