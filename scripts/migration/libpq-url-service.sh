#!/usr/bin/env bash

# Load a connection URL from an environment variable into a mode-0600 libpq
# service file so it never appears in a database client's process arguments.
LIBPQ_TEMP_SERVICE_FILE=''

configure_libpq_connection() {
  local url_env_name="$1"
  local url_value="${!url_env_name:-}"

  if [[ -n "${url_value}" ]]; then
    umask 077
    LIBPQ_TEMP_SERVICE_FILE="$(mktemp "${TMPDIR:-/tmp}/pair-research-libpq.XXXXXX")"
    local helper_dir
    helper_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    node "${helper_dir}/write-libpq-service.ts" "${url_env_name}" "${LIBPQ_TEMP_SERVICE_FILE}"
    export PGSERVICEFILE="${LIBPQ_TEMP_SERVICE_FILE}"
    export PGSERVICE='pair_research_ephemeral'
    unset "${url_env_name}"
  fi
}

cleanup_libpq_connection() {
  if [[ -n "${LIBPQ_TEMP_SERVICE_FILE}" ]]; then
    rm -f -- "${LIBPQ_TEMP_SERVICE_FILE}"
    rm -f -- "${LIBPQ_TEMP_SERVICE_FILE}.pgpass"
    LIBPQ_TEMP_SERVICE_FILE=''
  fi
}
