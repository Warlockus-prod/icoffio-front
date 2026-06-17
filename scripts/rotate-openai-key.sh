#!/usr/bin/env bash
#
# rotate-openai-key.sh — replace OPENAI_API_KEY on the VPS and locally in one go.
#
# Usage:   bash scripts/rotate-openai-key.sh
# Then paste the new key once when prompted (input is hidden — it never appears
# on screen, in shell history, or in any log). The key is sent to the VPS over
# stdin, so it never shows up in the server's process list either.
#
# What it does:
#   1. updates ./.env.local           (local dev)
#   2. updates /root/projects/icoffio-front/.env.production on the VPS (backup made)
#   3. force-recreates the app container so it picks up the new key (no rebuild —
#      OPENAI_API_KEY is a runtime var, not baked at build time)
#   4. checks the site health
#
# After it finishes: REVOKE the old key at https://platform.openai.com/api-keys
# (that is what actually stops the abuse).

set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/aiw_new_vps_ed25519}"
VPS="${VPS:-root@178.104.223.93}"
REMOTE_PROJ="/root/projects/icoffio-front"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_ENV="$SCRIPT_DIR/.env.local"

printf 'Вставь НОВЫЙ OpenAI ключ (ввод скрыт, Enter в конце): '
read -rs NEWKEY
printf '\n'

if [ -z "${NEWKEY:-}" ]; then
  echo "✗ Пустой ключ — отмена."; exit 1
fi
case "$NEWKEY" in
  sk-*) : ;;
  *) echo "⚠️  Ключ не начинается с 'sk-' — продолжаю, но проверь что вставил правильно." ;;
esac

# ── 1. local .env.local ───────────────────────────────────────────────
echo "→ Обновляю локальный .env.local …"
touch "$LOCAL_ENV"
grep -v '^OPENAI_API_KEY=' "$LOCAL_ENV" > "$LOCAL_ENV.tmp" 2>/dev/null || true
mv "$LOCAL_ENV.tmp" "$LOCAL_ENV"
printf 'OPENAI_API_KEY=%s\n' "$NEWKEY" >> "$LOCAL_ENV"
echo "  ✓ локально обновлён ($LOCAL_ENV)"

# ── 2 + 3. VPS .env.production + recreate container ───────────────────
echo "→ Обновляю сервер (.env.production) и пересоздаю контейнер …"
printf '%s' "$NEWKEY" | ssh -i "$SSH_KEY" -o ConnectTimeout=15 "$VPS" "
  set -e
  cd '$REMOTE_PROJ'
  NEWKEY=\"\$(cat)\"
  cp .env.production \".env.production.bak.\$(date +%s)\"
  grep -v '^OPENAI_API_KEY=' .env.production > .env.production.tmp || true
  printf 'OPENAI_API_KEY=%s\n' \"\$NEWKEY\" >> .env.production.tmp
  mv .env.production.tmp .env.production
  docker compose -f docker-compose.vps.yml --env-file .env.production up -d --force-recreate icoffio-front >/dev/null 2>&1
  echo '  ✓ сервер обновлён, контейнер пересоздан (бэкап .env.production.bak.* создан)'
"

# ── 4. health check ───────────────────────────────────────────────────
echo "→ Жду старта контейнера …"
sleep 10
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://web.icoffio.com/api/health || echo 000)"
echo "  health: HTTP $CODE"

unset NEWKEY
echo
echo "✅ Ключ заменён на сервере и локально (в GitHub НЕ попал — оба файла gitignored)."
echo "❗ Последний шаг (вручную): отзови СТАРЫЙ ключ на https://platform.openai.com/api-keys"
echo "   Без отзыва старый ключ продолжит работать у того, кто его абузил."
