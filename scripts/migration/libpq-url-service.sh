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
    if ! node "${helper_dir}/write-libpq-service.ts" "${url_env_name}" "${LIBPQ_TEMP_SERVICE_FILE}"; then
      cleanup_libpq_connection
      return 1
    fi
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

# Parse the stable user and host fields from psql's C-locale \conninfo output,
# then require an exact Supabase direct host or an exact pooler host suffix
# paired with the project-qualified pooler username.
resolve_supabase_connection_identity() {
  local connection_info="$1"
  local expected_project_ref="$2"
  local connection_summary="${connection_info%%$'\n'*}"
  local connection_details=''
  local connection_pattern='^You are connected to database "[^"]+" as user "([^"]+)" on host "([^"]+)"( \(address "[^"]+"\))? at port "[0-9]+"\.$'
  local ssl_pattern='^SSL connection \(.*\)$'
  local connection_user
  local connection_host
  local connection_form

  if [[ "${connection_info}" == *$'\n'* ]]; then
    connection_details="${connection_info#*$'\n'}"
    if [[ ! "${connection_details}" =~ ${ssl_pattern} ]]; then
      return 1
    fi
  fi
  if [[ ! "${connection_summary}" =~ ${connection_pattern} ]]; then
    return 1
  fi
  connection_user="${BASH_REMATCH[1]}"
  connection_host="${BASH_REMATCH[2]}"

  if [[ "${connection_host}" == "db.${expected_project_ref}.supabase.co" ]]; then
    connection_form='direct'
  elif [[ ("${connection_host}" == 'pooler.supabase.com' || "${connection_host}" == *'.pooler.supabase.com') \
    && "${connection_user}" == *."${expected_project_ref}" \
    && "${connection_user}" != ".${expected_project_ref}" ]]; then
    connection_form='pooler'
  else
    return 1
  fi

  printf '%s\t%s\t%s\n' "${connection_form}" "${connection_user}" "${connection_host}"
}
