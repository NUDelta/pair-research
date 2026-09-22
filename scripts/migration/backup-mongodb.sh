#!/usr/bin/env bash

set -euo pipefail

umask 077

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
require_env MONGODB_URI
require_env MONGODB_DATABASE
require_env MONGODB_SOURCE_LABEL
require_env MONGODB_WRITES_QUIESCED
require_command git
require_command gzip
require_command mongodump
require_command node
require_command shasum
require_command sed

if [[ ! "$MONGODB_DATABASE" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf 'Error: MONGODB_DATABASE may contain only letters, numbers, dot, underscore, and hyphen.\n' >&2
  exit 1
fi

if [[ "$MONGODB_SOURCE_LABEL" == *$'\n'* || "$MONGODB_SOURCE_LABEL" == *$'\r'* ]]; then
  printf 'Error: MONGODB_SOURCE_LABEL must be a single line.\n' >&2
  exit 1
fi

if [[ "$MONGODB_URI" == *$'\n'* || "$MONGODB_URI" == *$'\r'* || "$MONGODB_URI" == *"'"* ]]; then
  printf 'Error: MONGODB_URI contains characters unsafe for the temporary MongoDB config file.\n' >&2
  exit 1
fi

if [[ "$MONGODB_WRITES_QUIESCED" != 'yes' ]]; then
  printf 'Error: stop application writes and set MONGODB_WRITES_QUIESCED=yes for a consistent database-scoped dump.\n' >&2
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
backup_dir="$backup_root_real/mongodb-$timestamp"
artifact_name="mongodb-${MONGODB_DATABASE}-${timestamp}.mongodump.archive.gz"
artifact_path="$backup_dir/$artifact_name"
partial_artifact_path="$artifact_path.partial"
manifest_path="$backup_dir/backup-manifest.txt"
checksum_path="$backup_dir/backup-checksums.sha256"
dump_log_path="$backup_dir/mongodump.log"
count_ledger_path="$backup_dir/backup-time-extraction-counts.tsv"
mongo_config_path="$backup_dir/.mongodump-config.yml"
failure_marker_path="$backup_dir/BACKUP_FAILED"

mkdir -m 700 "$backup_dir"

backup_succeeded=0
cleanup() {
  rm -f -- "$mongo_config_path"
  if [[ "$backup_succeeded" -ne 1 ]]; then
    printf 'Backup did not complete. Do not use files in this directory.\n' > "$failure_marker_path"
    chmod 600 "$failure_marker_path"
  fi
}
trap cleanup EXIT

# Keep the credentialed URI out of the process argument list. MongoDB requires
# literal reserved URI characters to be percent-encoded, so a single-quoted
# YAML scalar is safe after the validation above.
printf "uri: '%s'\n" "$MONGODB_URI" > "$mongo_config_path"
chmod 600 "$mongo_config_path"
unset MONGODB_URI

if ! mongodump \
  --config="$mongo_config_path" \
  --db="$MONGODB_DATABASE" \
  --archive="$partial_artifact_path" \
  --gzip \
  2> "$dump_log_path"; then
  cat "$dump_log_path" >&2
  exit 1
fi
cat "$dump_log_path" >&2

chmod 600 "$dump_log_path"
node "${repository_root}/scripts/migration/extract-mongodb-dump-ledger.ts" \
  "$MONGODB_DATABASE" "$dump_log_path" "$count_ledger_path"
chmod 600 "$count_ledger_path"

gzip --test "$partial_artifact_path"
mv "$partial_artifact_path" "$artifact_path"
chmod 600 "$artifact_path"
artifact_checksum="$(shasum -a 256 "$artifact_path" | awk '{print $1}')"
{
  printf '%s  %s\n' "$artifact_checksum" "$artifact_name"
  shasum -a 256 "$dump_log_path" "$count_ledger_path" | sed 's#  .*/#  #'
} > "$checksum_path"
chmod 600 "$checksum_path"

mongo_version="$(mongodump --version | head -n 1)"
{
  printf 'Pair Research MongoDB logical backup manifest\n'
  printf 'Created (UTC): %s\n' "$timestamp"
  printf 'Source: %s\n' "$MONGODB_SOURCE_LABEL"
  printf 'Database: %s\n' "$MONGODB_DATABASE"
  printf 'Write quiescence confirmed: yes\n'
  printf 'Tool: %s\n' "$mongo_version"
  printf 'Command: mongodump --config=<protected-temporary-file> --db=<database> --archive=<artifact> --gzip\n'
  printf 'Filename: %s\n' "$artifact_name"
  printf 'SHA-256: %s\n' "$artifact_checksum"
  printf 'Checksum file: %s\n' "$(basename "$checksum_path")"
  printf 'Backup log: %s\n' "$(basename "$dump_log_path")"
  printf 'Extraction-count ledger: %s\n' "$(basename "$count_ledger_path")"
  printf 'Credential material recorded: no\n'
} > "$manifest_path"
chmod 600 "$manifest_path"

backup_succeeded=1
trap - EXIT
rm -f -- "$mongo_config_path"

printf 'MongoDB backup created at %s\n' "$backup_dir"
printf 'Verify it with: %s %s\n' \
  "$repository_root/scripts/migration/verify-backup.sh" \
  "$manifest_path"
