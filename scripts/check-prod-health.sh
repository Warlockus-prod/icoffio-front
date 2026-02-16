#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

targets=(
  "https://icoffio.com/pl"
  "https://www.icoffio.com/pl"
  "https://app.icoffio.com/pl"
  "https://icoffio-front.vercel.app/pl"
)

echo "Icoffio production health check"
echo "Timestamp: ${timestamp}"
echo

check_url() {
  local url="$1"
  local body_file="${tmp_dir}/body"
  local err_file="${tmp_dir}/err"
  local meta_file="${tmp_dir}/meta"

  if curl -sS --max-time 20 -o "${body_file}" -D "${meta_file}" "${url}" 2>"${err_file}"; then
    local status
    local server
    local status_label
    status="$(awk 'BEGIN{IGNORECASE=1}/^HTTP/{code=$2}END{print code}' "${meta_file}")"
    server="$(awk 'BEGIN{IGNORECASE=1}/^server:/{sub(/\r$/,"",$2); print $2; exit}' "${meta_file}")"
    status="${status:-unknown}"
    server="${server:-unknown}"
    if [[ "${status}" =~ ^[0-9]+$ ]] && (( status >= 200 && status < 400 )); then
      status_label='OK'
    else
      status_label='WARN'
    fi
    printf '[%s] %-40s status=%s server=%s\n' "${status_label}" "${url}" "${status}" "${server}"
  else
    local err
    err="$(tr -d '\n' <"${err_file}")"
    printf '[ERR] %-40s error=%s\n' "${url}" "${err:-curl_failed}"
  fi
}

for target in "${targets[@]}"; do
  check_url "${target}"
done

echo
echo "DNS snapshot:"
app_cname="$(dig +short app.icoffio.com CNAME | head -n 1)"
www_cname="$(dig +short www.icoffio.com CNAME | head -n 1)"
app_a="$(dig +short app.icoffio.com A | tr '\n' ' ')"
www_a="$(dig +short www.icoffio.com A | tr '\n' ' ')"

echo "  app CNAME: ${app_cname:-<none>}"
echo "  app A:     ${app_a:-<none>}"
echo "  www CNAME: ${www_cname:-<none>}"
echo "  www A:     ${www_a:-<none>}"
