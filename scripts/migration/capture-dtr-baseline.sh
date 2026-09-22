#!/usr/bin/env bash
set -euo pipefail
umask 077

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./libpq-url-service.sh
source "${script_dir}/libpq-url-service.sh"

: "${DTR_GROUP_ID:?Set DTR_GROUP_ID}"
: "${DTR_BASELINE_ROOT:?Set an absolute DTR_BASELINE_ROOT outside the repository}"
: "${DTR_EXPECTED_PROJECT_REF:?Set the verified production Supabase project ref}"
: "${DTR_SOURCE_LABEL:?Set a reviewed non-secret production source label}"

if [[ ! "${DTR_GROUP_ID}" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  printf 'Error: DTR_GROUP_ID must be a UUID.\n' >&2
  exit 1
fi
if [[ "${DTR_BASELINE_ROOT}" != /* ]]; then
  printf 'Error: DTR_BASELINE_ROOT must be absolute.\n' >&2
  exit 1
fi
if [[ ! "${DTR_EXPECTED_PROJECT_REF}" =~ ^[a-z0-9]{20}$ ]]; then
  printf 'Error: DTR_EXPECTED_PROJECT_REF must be a 20-character Supabase project ref.\n' >&2
  exit 1
fi
if [[ "${DTR_SOURCE_LABEL}" == *$'\n'* || "${DTR_SOURCE_LABEL}" == *$'\r'* ]]; then
  printf 'Error: DTR_SOURCE_LABEL must be a single line.\n' >&2
  exit 1
fi
if [[ -z "${PHASE_0B_ADMIN_DATABASE_URL:-}" && -z "${PGSERVICE:-}" ]]; then
  printf 'Error: set PHASE_0B_ADMIN_DATABASE_URL or a protected PGSERVICE.\n' >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  printf 'Error: jq is required to validate the DTR baseline artifact.\n' >&2
  exit 1
fi

repository_root="$(git rev-parse --show-toplevel)"
mkdir -p "${DTR_BASELINE_ROOT}"
baseline_root="$(cd "${DTR_BASELINE_ROOT}" && pwd -P)"
case "${baseline_root}/" in
  "${repository_root}/"*)
    printf 'Error: DTR baseline must be stored outside the repository.\n' >&2
    exit 1
    ;;
esac

configure_libpq_connection PHASE_0B_ADMIN_DATABASE_URL

if ! connection_info="$(LC_ALL=C psql --no-psqlrc --command='\conninfo' 2>&1)"; then
  cleanup_libpq_connection
  printf 'Error: unable to read the effective database connection identity.\n' >&2
  exit 1
fi
if ! connection_identity="$(resolve_supabase_connection_identity \
  "${connection_info}" "${DTR_EXPECTED_PROJECT_REF}")"; then
  cleanup_libpq_connection
  printf 'Error: database connection identity is not a supported direct or pooler target for project ref %s.\n' \
    "${DTR_EXPECTED_PROJECT_REF}" >&2
  exit 1
fi
IFS=$'\t' read -r connection_form connection_user connection_host <<< "${connection_identity}"
connection_target="${connection_user}@${connection_host}"

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
artifact="${baseline_root}/dtr-baseline-${timestamp}.json"
partial_artifact="${artifact}.partial"
cleanup() {
  rm -f -- "${partial_artifact}"
  cleanup_libpq_connection
}
trap cleanup EXIT

psql --no-psqlrc --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  --set="dtr_group_id=${DTR_GROUP_ID}" \
  --set="dtr_project_ref=${DTR_EXPECTED_PROJECT_REF}" \
  --set="dtr_source_label=${DTR_SOURCE_LABEL}" \
  --set="dtr_connection_form=${connection_form}" \
  --set="dtr_connection_target=${connection_target}" \
  --file "${script_dir}/capture-dtr-baseline.sql" > "${partial_artifact}"
jq -e --arg project_ref "${DTR_EXPECTED_PROJECT_REF}" \
  '.source_identity.project_ref == $project_ref and .group.id != null and (.memberships | type == "array") and (.group_roles | type == "array")' \
  "${partial_artifact}" >/dev/null
mv "${partial_artifact}" "${artifact}"
chmod 600 "${artifact}"
shasum -a 256 "${artifact}" > "${artifact}.sha256"
chmod 600 "${artifact}.sha256"
cleanup_libpq_connection
trap - EXIT

printf 'DTR baseline written outside the repository: %s\n' "${artifact}"
