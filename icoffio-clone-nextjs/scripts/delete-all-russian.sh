#!/bin/bash
# 🗑️ Скрипт для удаления всех русских статей через API

API_URL="https://app.icoffio.com/api/admin/bulk-delete-wordpress"

SLUGS=(
  "apple-pl" "apple-en" "pl-2" "en-5"
  "google-android-sms-ios-pl" "google-android-sms-ios-en"
  "en-4" "en-3" "pl" "en-2"
  "test-article-benefits-of-coffee-for-productivity-en"
  "siri-google-gemini-pl-4" "siri-google-gemini-pl-3"
  "siri-google-gemini-en-4" "siri-google-gemini-en-3"
  "siri-google-gemini-pl-2" "siri-google-gemini-en-2"
  "siri-google-gemini-pl" "siri-google-gemini-en"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-4"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-3"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-4"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-2"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-2"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl"
  "ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en"
  "ai-edited-test-en-2" "en"
)

echo "🗑️  УДАЛЕНИЕ 29 РУССКИХ СТАТЕЙ ЧЕРЕЗ API"
echo ""

# Формируем JSON массив
SLUGS_JSON=$(printf '%s\n' "${SLUGS[@]}" | jq -R . | jq -s .)

echo "📤 Отправляем запрос на удаление..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"slugs\": $SLUGS_JSON}")

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
DELETED=$(echo "$RESPONSE" | jq -r '.deleted // 0')

if [ "$SUCCESS" = "true" ] && [ "$DELETED" -gt 0 ]; then
  echo ""
  echo "✅ Удалено $DELETED статей!"
  echo "🌐 Проверьте: https://app.icoffio.com"
else
  echo ""
  echo "⚠️  Проверьте ответ API выше"
fi

