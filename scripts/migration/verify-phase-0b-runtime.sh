#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./libpq-url-service.sh
source "${script_dir}/libpq-url-service.sh"

if [[ -z "${PHASE_0B_RUNTIME_DATABASE_URL:-}" && -z "${PGSERVICE:-}" ]]; then
  printf 'Error: set PHASE_0B_RUNTIME_DATABASE_URL or a protected runtime PGSERVICE.\n' >&2
  exit 1
fi

configure_libpq_connection PHASE_0B_RUNTIME_DATABASE_URL
trap cleanup_libpq_connection EXIT

psql --no-psqlrc --set=ON_ERROR_STOP=1 --file "${script_dir}/verify-phase-0b-runtime.sql"
