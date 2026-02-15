#!/usr/bin/env python3
"""
Telegram Webhook Reset Script
Полное пересоздание webhook с нуля
"""

import json
import sys
import requests
from pathlib import Path

def load_config():
    """Загрузить конфигурацию из JSON"""
    config_file = Path(__file__).parent / 'telegram-reset-config.json'
    
    if not config_file.exists():
        print("❌ ОШИБКА: telegram-reset-config.json не найден!")
        print("\nСоздайте файл telegram-reset-config.json:")
        print("""
{
  "telegram_bot_token": "YOUR_BOT_TOKEN",
  "telegram_secret_token": "random_32_chars_string",
  "webhook_url": "https://app.icoffio.com/api/telegram-simple/webhook"
}
        """)
        sys.exit(1)
    
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    # Validate
    required = ['telegram_bot_token', 'telegram_secret_token', 'webhook_url']
    for key in required:
        if not config.get(key):
            print(f"❌ ОШИБКА: {key} не указан в конфигурации!")
            sys.exit(1)
    
    return config

def delete_webhook(bot_token):
    """Удалить существующий webhook"""
    url = f"https://api.telegram.org/bot{bot_token}/deleteWebhook"
    
    print("🗑️  Удаляю старый webhook...")
    response = requests.post(url, json={"drop_pending_updates": True})
    
    if response.status_code == 200 and response.json().get('ok'):
        print("✅ Старый webhook удалён")
        return True
    else:
        print(f"⚠️  Предупреждение при удалении: {response.text}")
        return False

def set_webhook(bot_token, webhook_url, secret_token):
    """Установить новый webhook"""
    url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
    
    payload = {
        "url": webhook_url,
        "secret_token": secret_token,
        "drop_pending_updates": True,
        "max_connections": 40,
        "allowed_updates": ["message", "callback_query"]
    }
    
    print(f"🔗 Устанавливаю webhook: {webhook_url}")
    response = requests.post(url, json=payload)
    
    if response.status_code == 200 and response.json().get('ok'):
        print("✅ Webhook установлен успешно!")
        return True
    else:
        print(f"❌ ОШИБКА установки webhook: {response.text}")
        return False

def get_webhook_info(bot_token):
    """Получить информацию о webhook"""
    url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
    
    print("ℹ️  Проверяю webhook...")
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('ok'):
            info = data.get('result', {})
            
            print("\n📊 СТАТУС WEBHOOK:")
            print(f"  URL: {info.get('url', 'не установлен')}")
            print(f"  Pending updates: {info.get('pending_update_count', 0)}")
            print(f"  Max connections: {info.get('max_connections', 0)}")
            
            if info.get('last_error_date'):
                print(f"  ⚠️  Последняя ошибка: {info.get('last_error_message')}")
            else:
                print("  ✅ Ошибок нет")
            
            return info
    
    print(f"❌ Не удалось получить информацию: {response.text}")
    return None

def main():
    print("=" * 60)
    print("🔄 TELEGRAM WEBHOOK - ПОЛНЫЙ СБРОС")
    print("=" * 60)
    print()
    
    # 1. Загрузить конфигурацию
    config = load_config()
    bot_token = config['telegram_bot_token']
    secret_token = config['telegram_secret_token']
    webhook_url = config['webhook_url']
    
    print(f"📱 Bot Token: {bot_token[:10]}...{bot_token[-10:]}")
    print(f"🔐 Secret Token: {secret_token[:10]}...{secret_token[-10:]}")
    print(f"🌐 Webhook URL: {webhook_url}")
    print()
    
    # 2. Удалить старый webhook
    delete_webhook(bot_token)
    print()
    
    # 3. Установить новый webhook
    if not set_webhook(bot_token, webhook_url, secret_token):
        print("\n❌ ОШИБКА: Не удалось установить webhook!")
        sys.exit(1)
    print()
    
    # 4. Проверить статус
    info = get_webhook_info(bot_token)
    print()
    
    # 5. Итоговый статус
    if info and info.get('url') == webhook_url:
        print("=" * 60)
        print("✅ УСПЕХ! WEBHOOK АКТИВЕН")
        print("=" * 60)
        print()
        print("🧪 СЛЕДУЮЩИЙ ШАГ: Тест в Telegram")
        print("   1. Откройте бота в Telegram")
        print("   2. Отправьте: /start")
        print("   3. Отправьте текст статьи")
        print()
        return 0
    else:
        print("=" * 60)
        print("❌ ОШИБКА: Webhook не активен!")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())

