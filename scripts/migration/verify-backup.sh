#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s /absolute/path/to/backup-manifest.txt\n' "$0" >&2
  exit 1
fi

manifest_path="$1"
if [[ ! -f "$manifest_path" ]]; then
  printf 'Error: manifest does not exist: %s\n' "$manifest_path" >&2
  exit 1
fi

if ! command -v shasum >/dev/null 2>&1; then
  printf 'Error: shasum is required to verify this backup.\n' >&2
  exit 1
fi

backup_dir="$(cd "$(dirname "$manifest_path")" && pwd -P)"
checksum_filename="$(awk -F': ' '/^Checksum file: / { print $2; exit }' "$manifest_path")"
artifact_filename="$(awk -F': ' '/^Filename: / { print $2; exit }' "$manifest_path")"
manifest_checksum="$(awk -F': ' '/^SHA-256: / { print $2; exit }' "$manifest_path")"

if [[ -z "$checksum_filename" || "$checksum_filename" == */* ]]; then
  printf 'Error: manifest contains an invalid checksum filename.\n' >&2
  exit 1
fi

if [[ -z "$artifact_filename" || "$artifact_filename" == */* ]]; then
  printf 'Error: manifest contains an invalid artifact filename.\n' >&2
  exit 1
fi

if [[ ! "$manifest_checksum" =~ ^[0-9a-f]{64}$ ]]; then
  printf 'Error: manifest contains an invalid SHA-256 value.\n' >&2
  exit 1
fi

checksum_path="$backup_dir/$checksum_filename"
if [[ ! -f "$checksum_path" ]]; then
  printf 'Error: checksum file does not exist: %s\n' "$checksum_path" >&2
  exit 1
fi

if [[ ! -f "$backup_dir/$artifact_filename" ]]; then
  printf 'Error: backup artifact does not exist: %s\n' "$backup_dir/$artifact_filename" >&2
  exit 1
fi

read -r checksum_file_hash checksum_file_name < "$checksum_path"
if [[ "$checksum_file_hash" != "$manifest_checksum" || "$checksum_file_name" != "$artifact_filename" ]]; then
  printf 'Error: checksum file does not match the manifest.\n' >&2
  exit 1
fi

actual_checksum="$(shasum -a 256 "$backup_dir/$artifact_filename" | awk '{print $1}')"
if [[ "$actual_checksum" != "$manifest_checksum" ]]; then
  printf 'Error: SHA-256 verification failed for %s.\n' "$artifact_filename" >&2
  exit 1
fi

case "$artifact_filename" in
  *.pgdump)
    command -v pg_restore >/dev/null 2>&1 || {
      printf 'Error: pg_restore is required to validate this archive.\n' >&2
      exit 1
    }
    pg_restore --list "$backup_dir/$artifact_filename" >/dev/null
    ;;
  *.mongodump.archive.gz)
    command -v gzip >/dev/null 2>&1 || {
      printf 'Error: gzip is required to validate this archive.\n' >&2
      exit 1
    }
    # mongorestore --dryRun still connects to a database. Keep routine
    # verification offline; perform archive parsing during an isolated restore
    # rehearsal as documented in the runbook.
    gzip --test "$backup_dir/$artifact_filename"
    ;;
  *)
    printf 'Error: unsupported backup artifact: %s\n' "$artifact_filename" >&2
    exit 1
    ;;
esac

printf 'Backup checksum and offline format checks passed: %s\n' "$artifact_filename"
