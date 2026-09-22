#!/usr/bin/env bash

set -euo pipefail

umask 077

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./libpq-url-service.sh
source "${script_dir}/libpq-url-service.sh"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Error: %s is required.\n' "$name" >&2
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    printf 'Error: required command not found: %s\n' "$name" >&2
    exit 1
  fi
}

require_env BACKUP_ROOT
require_env SUPABASE_SOURCE_LABEL
require_command git
require_command pg_dump
require_command pg_restore
require_command shasum

if [[ -n "${SUPABASE_DATABASE_URL:-}" ]]; then
  configure_libpq_connection SUPABASE_DATABASE_URL
elif [[ -z "${PGSERVICE:-}" && -z "${PGDATABASE:-}" ]]; then
  printf 'Error: set SUPABASE_DATABASE_URL, PGDATABASE, or a protected PGSERVICE configuration.\n' >&2
  exit 1
fi

if [[ "$SUPABASE_SOURCE_LABEL" == *$'\n'* || "$SUPABASE_SOURCE_LABEL" == *$'\r'* ]]; then
  printf 'Error: SUPABASE_SOURCE_LABEL must be a single line.\n' >&2
  exit 1
fi

if [[ "$BACKUP_ROOT" != /* ]]; then
  printf 'Error: BACKUP_ROOT must be an absolute path outside the Git repository.\n' >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT"
backup_root_real="$(cd "$BACKUP_ROOT" && pwd -P)"
repository_root="$(git rev-parse --show-toplevel)"

case "$backup_root_real/" in
  "$repository_root/"*)
    printf 'Error: BACKUP_ROOT must be outside %s.\n' "$repository_root" >&2
    exit 1
    ;;
esac

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
backup_dir="$backup_root_real/supabase-$timestamp"
artifact_name="supabase-public-auth-migrations-${timestamp}.pgdump"
artifact_path="$backup_dir/$artifact_name"
partial_artifact_path="$artifact_path.partial"
manifest_path="$backup_dir/backup-manifest.txt"
checksum_path="$backup_dir/backup-checksums.sha256"
failure_marker_path="$backup_dir/BACKUP_FAILED"

mkdir -m 700 "$backup_dir"

backup_succeeded=0
mark_failed() {
  cleanup_libpq_connection
  if [[ "$backup_succeeded" -ne 1 ]]; then
    printf 'Backup did not complete. Do not use files in this directory.\n' > "$failure_marker_path"
    chmod 600 "$failure_marker_path"
  fi
}
trap mark_failed EXIT

pg_dump \
  --format=custom \
  --file="$partial_artifact_path" \
  --schema=public \
  --schema=auth \
  --schema=supabase_migrations \
  --strict-names \
  --no-subscriptions \
  --no-password

# Parsing the archive TOC detects truncation or an invalid custom-format file.
pg_restore --list "$partial_artifact_path" >/dev/null
mv "$partial_artifact_path" "$artifact_path"
chmod 600 "$artifact_path"

artifact_checksum="$(shasum -a 256 "$artifact_path" | awk '{print $1}')"
printf '%s  %s\n' "$artifact_checksum" "$artifact_name" > "$checksum_path"
chmod 600 "$checksum_path"

pg_dump_version="$(pg_dump --version)"
{
  printf 'Pair Research Supabase/PostgreSQL logical backup manifest\n'
  printf 'Created (UTC): %s\n' "$timestamp"
  printf 'Source: %s\n' "$SUPABASE_SOURCE_LABEL"
  printf 'Schemas: public, auth, supabase_migrations\n'
  printf 'Tool: %s\n' "$pg_dump_version"
  printf 'Command: pg_dump <protected libpq connection> --format=custom --schema=public --schema=auth --schema=supabase_migrations --strict-names --no-subscriptions --no-password\n'
  printf 'Filename: %s\n' "$artifact_name"
  printf 'SHA-256: %s\n' "$artifact_checksum"
  printf 'Checksum file: %s\n' "$(basename "$checksum_path")"
  printf 'Archive TOC validation: passed\n'
  printf 'Credential material recorded: no\n'
} > "$manifest_path"
chmod 600 "$manifest_path"

backup_succeeded=1
cleanup_libpq_connection
trap - EXIT

printf 'Supabase/PostgreSQL backup created at %s\n' "$backup_dir"
printf 'Verify it with: %s %s\n' \
  "$repository_root/scripts/migration/verify-backup.sh" \
  "$manifest_path"
