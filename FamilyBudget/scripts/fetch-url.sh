#!/usr/bin/env bash
# Обёртка как в PHP-проекте. Укажите свой venv или скопируйте fetch-url.py сюда.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${FAMILY_BUDGET_PYTHON_VENV:-}" && -f "${FAMILY_BUDGET_PYTHON_VENV}/bin/activate" ]]; then
  # shellcheck disable=SC1090
  source "${FAMILY_BUDGET_PYTHON_VENV}/bin/activate"
fi

if [[ ! -f "${SCRIPT_DIR}/fetch-url.py" ]]; then
  echo "Selenium: fetch-url.py not found in ${SCRIPT_DIR}" >&2
  echo "Copy from your PHP project or set FAMILY_BUDGET_FETCH_SCRIPT to existing fetch-url.sh" >&2
  exit 1
fi

exec python3 "${SCRIPT_DIR}/fetch-url.py" "$@"
