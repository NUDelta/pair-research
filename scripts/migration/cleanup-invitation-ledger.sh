#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./libpq-url-service.sh
source "${script_dir}/libpq-url-service.sh"

: "${INVITATION_LEDGER_RETENTION_DAYS:=30}"
: "${INVITATION_LEDGER_BATCH_SIZE:=1000}"

if [[ ! "${INVITATION_LEDGER_RETENTION_DAYS}" =~ ^[0-9]+$ || "${INVITATION_LEDGER_RETENTION_DAYS}" -lt 30 ]]; then
  printf 'Error: INVITATION_LEDGER_RETENTION_DAYS must be an integer of at least 30.\n' >&2
  exit 1
fi
if [[ ! "${INVITATION_LEDGER_BATCH_SIZE}" =~ ^[0-9]+$ || "${INVITATION_LEDGER_BATCH_SIZE}" -lt 1 || "${INVITATION_LEDGER_BATCH_SIZE}" -gt 10000 ]]; then
  printf 'Error: INVITATION_LEDGER_BATCH_SIZE must be between 1 and 10000.\n' >&2
  exit 1
fi
if [[ -z "${PHASE_0B_ADMIN_DATABASE_URL:-}" && -z "${PGSERVICE:-}" ]]; then
  printf 'Error: set PHASE_0B_ADMIN_DATABASE_URL or a protected admin PGSERVICE.\n' >&2
  exit 1
fi

configure_libpq_connection PHASE_0B_ADMIN_DATABASE_URL
trap cleanup_libpq_connection EXIT

psql --no-psqlrc --set=ON_ERROR_STOP=1 \
  --set="retention_days=${INVITATION_LEDGER_RETENTION_DAYS}" \
  --set="batch_size=${INVITATION_LEDGER_BATCH_SIZE}" \
  --file "${script_dir}/cleanup-invitation-ledger.sql"
