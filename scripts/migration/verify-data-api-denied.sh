#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${SUPABASE_URL:?Set SUPABASE_URL}"
: "${SUPABASE_PUBLISHABLE_KEY:?Set SUPABASE_PUBLISHABLE_KEY}"

if ! command -v jq >/dev/null 2>&1; then
  printf 'Error: jq is required to validate authenticated test identities.\n' >&2
  exit 1
fi

tables=(affinity group group_member group_role pair pairing profile task task_help_capacity invitation_security_event)
contexts=(unrelated member admin owner)
token_names=(SUPABASE_UNRELATED_ACCESS_TOKEN SUPABASE_MEMBER_ACCESS_TOKEN SUPABASE_ADMIN_ACCESS_TOKEN SUPABASE_OWNER_ACCESS_TOKEN)
user_id_names=(SUPABASE_UNRELATED_USER_ID SUPABASE_MEMBER_USER_ID SUPABASE_ADMIN_USER_ID SUPABASE_OWNER_USER_ID)
temporary_root="$(mktemp -d)"
trap 'rm -rf "${temporary_root}"' EXIT

for index in "${!contexts[@]}"; do
  context="${contexts[$index]}"
  token_name="${token_names[$index]}"
  user_id_name="${user_id_names[$index]}"
  bearer="${!token_name:-}"
  expected_user_id="${!user_id_name:-}"
  if [[ -z "${bearer}" || -z "${expected_user_id}" ]]; then
    printf 'Error: set %s and %s for the %s Data API check.\n' \
      "${token_name}" "${user_id_name}" "${context}" >&2
    exit 1
  fi

  auth_body="${temporary_root}/${context}-auth-user.json"
  auth_status="$(curl --silent --show-error --output "${auth_body}" --write-out '%{http_code}' \
    "${SUPABASE_URL%/}/auth/v1/user" \
    -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
    -H "Authorization: Bearer ${bearer}")"
  if [[ "${auth_status}" != "200" ]] || ! jq -e --arg expected "${expected_user_id}" '.id == $expected' "${auth_body}" >/dev/null; then
    printf 'Error: the %s access token is invalid or belongs to the wrong test identity.\n' "${context}" >&2
    exit 1
  fi
done

for table in "${tables[@]}"; do
  status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "${SUPABASE_URL%/}/rest/v1/${table}?select=*&limit=1" \
    -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}")"
  if [[ "${status}" != "401" && "${status}" != "403" ]]; then
    printf 'Error: anon Data API read for %s returned HTTP %s; expected 401 or 403.\n' \
      "${table}" "${status}" >&2
    exit 1
  fi
done

for index in "${!contexts[@]}"; do
  context="${contexts[$index]}"
  token_name="${token_names[$index]}"
  bearer="${!token_name}"

  for table in "${tables[@]}"; do
    status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
      "${SUPABASE_URL%/}/rest/v1/${table}?select=*&limit=1" \
      -H "apikey: ${SUPABASE_PUBLISHABLE_KEY}" \
      -H "Authorization: Bearer ${bearer}")"

    if [[ "${status}" != "401" && "${status}" != "403" ]]; then
      printf 'Error: %s Data API read for %s returned HTTP %s; expected 401 or 403.\n' \
        "${context}" "${table}" "${status}" >&2
      exit 1
    fi
  done
done

printf 'Data API denial matrix passed for anon, unrelated, member, admin, and owner contexts.\n'
