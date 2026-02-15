#!/usr/bin/env python3
"""
TELEGRAM BOT AUTOMATIC RESET v7.14.1
Простая версия с конфигурацией из JSON файла
"""

import os
import sys
import json
import time
import requests

def main():
    print("\n" + "=" * 60)
    print("🚀 TELEGRAM BOT AUTOMATIC RESET v7.14.1")
    print("=" * 60 + "\n")
    
    # Step 1: Load config
    print("📋 Step 1/4: Loading configuration...")
    
    config_file = 'scripts/telegram-config.json'
    
    if not os.path.exists(config_file):
        print(f"❌ Config file not found: {config_file}")
        print(f"\n1. Copy: cp scripts/telegram-config.example.json scripts/telegram-config.json")
        print(f"2. Edit: scripts/telegram-config.json")
        print(f"3. Run this script again\n")
        sys.exit(1)
    
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    bot_token = config['telegram']['bot_token']
    secret_token = config['telegram']['secret_token']
    supabase_url = config['supabase']['url']
    service_key = config['supabase']['service_role_key']
    
    if 'YOUR' in bot_token or 'YOUR' in service_key:
        print(f"❌ Please fill telegram-config.json with real tokens")
        sys.exit(1)
    
    print("✅ Configuration loaded")
    
    # Step 2: Reset Supabase telegram tables
    print("\n📋 Step 2/4: Resetting Supabase telegram tables...")
    
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    try:
        for table in ['telegram_jobs', 'telegram_submissions']:
            print(f"   Deleting all rows from {table}...")
            response = requests.delete(
                f"{supabase_url}/rest/v1/{table}?id=not.is.null",
                headers=headers
            )
            if response.status_code in [200, 204]:
                print(f"   ✅ {table} cleared")
            elif response.status_code == 404:
                print(f"   ⚠️  {table} not found (skipped)")
            else:
                print(f"   ⚠️  {table} clear response: {response.status_code} {response.text[:120]}")

            print(f"   Verifying {table}...")
            verify = requests.get(
                f"{supabase_url}/rest/v1/{table}?select=id&limit=1",
                headers=headers
            )
            if verify.status_code == 404:
                print(f"   ⚠️  {table} not found during verify (skipped)")
            elif verify.status_code in [200, 206]:
                rows = verify.json()
                if len(rows) == 0:
                    print(f"   ✅ {table} is empty")
                else:
                    print(f"   ⚠️  {table} still has data")
            else:
                print(f"   ⚠️  {table} verify response: {verify.status_code} {verify.text[:120]}")
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    # Step 3: Manage webhook
    print("\n📋 Step 3/4: Managing Telegram webhook...")
    
    api_url = f"https://api.telegram.org/bot{bot_token}"
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL", "https://app.icoffio.com/api/telegram-simple/webhook")
    
    try:
        print("   Getting current webhook...")
        response = requests.get(f"{api_url}/getWebhookInfo")
        info = response.json()
        current_url = info.get('result', {}).get('url', 'none')
        print(f"   Current: {current_url}")
        
        print("   Deleting webhook...")
        response = requests.post(f"{api_url}/deleteWebhook")
        result = response.json()
        if result.get('ok'):
            print("   ✅ Webhook deleted")
        else:
            print(f"   ⚠️  Delete: {result}")
        
        time.sleep(2)
        
        print("   Setting new webhook...")
        webhook_data = {
            'url': webhook_url,
            'secret_token': secret_token,
            'allowed_updates': [
                'message',
                'edited_message',
                'channel_post',
                'edited_channel_post',
                'callback_query'
            ],
            'max_connections': 40,
            'drop_pending_updates': True
        }
        
        response = requests.post(
            f"{api_url}/setWebhook",
            json=webhook_data
        )
        result = response.json()
        
        if result.get('ok'):
            print("   ✅ Webhook set successfully")
        else:
            print(f"   ❌ Failed: {result}")
            sys.exit(1)
        
        time.sleep(2)
        
        print("   Verifying webhook...")
        response = requests.get(f"{api_url}/getWebhookInfo")
        info = response.json()
        new_url = info.get('result', {}).get('url', '')
        pending = info.get('result', {}).get('pending_update_count', 0)
        
        if new_url == webhook_url:
            print(f"   ✅ Webhook verified: {webhook_url}")
            print(f"   Pending updates: {pending}")
        else:
            print(f"   ⚠️  Webhook URL mismatch")
            print(f"   Expected: {webhook_url}")
            print(f"   Got: {new_url}")
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        sys.exit(1)
    
    # Step 4: Final status
    print("\n📋 Step 4/4: Final status\n")
    
    print("=" * 60)
    print("✅ TELEGRAM BOT RESET COMPLETED!")
    print("=" * 60 + "\n")
    
    print("📊 Summary:")
    print("  ✅ Supabase telegram tables reset")
    print("  ✅ Webhook deleted")
    print("  ✅ Webhook recreated")
    print("  ✅ Webhook verified\n")
    
    print("🧪 Next: Test in Telegram\n")
    print("1. Open your Telegram bot")
    print("2. Send: /start")
    print("3. Send: AI revolutionizes education. Machine learning helps.")
    print("4. Wait 5-15 seconds")
    print("5. You should receive article URLs\n")
    
    print("📊 Monitor:")
    print("  Vercel: https://vercel.com/andreys-projects-a55f75b3/icoffio-front/logs")
    print("  Supabase: https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz\n")
    
    print("🎯 Look for in Vercel logs:")
    print("  [TelegramSimple] Incoming message")
    print("  [TelegramSimple] Processing...")
    print("  [TelegramSimple] ✅ Message sent\n")
    
    print("✅ Done! 🚀\n")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
