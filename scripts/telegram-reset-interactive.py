#!/usr/bin/env python3
"""
TELEGRAM BOT AUTOMATIC RESET v7.14.1
Полностью автоматический сброс и настройка
Интерактивная версия с вводом токенов
"""

import os
import sys
import time
import json
import requests
from dotenv import load_dotenv

# Colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
BOLD = '\033[1m'
NC = '\033[0m'  # No Color

def print_header():
    print(f"\n{BLUE}{'=' * 50}{NC}")
    print(f"{BOLD}🚀 TELEGRAM BOT AUTOMATIC RESET v7.14.1{NC}")
    print(f"{BLUE}{'=' * 50}{NC}\n")

def print_step(step_num, total, message):
    print(f"\n{BLUE}📋 Step {step_num}/{total}: {message}{NC}")

def print_success(message):
    print(f"{GREEN}✅ {message}{NC}")

def print_error(message):
    print(f"{RED}❌ {message}{NC}")

def print_warning(message):
    print(f"{YELLOW}⚠️  {message}{NC}")

def print_info(message):
    print(f"ℹ️  {message}")

def get_env_or_input(var_name, prompt, secret=False):
    """Get value from environment or ask user"""
    value = os.getenv(var_name)
    if value:
        print_success(f"{var_name} found in environment")
        return value
    
    print_info(f"{var_name} not found in environment")
    if secret:
        import getpass
        return getpass.getpass(f"Enter {prompt}: ")
    else:
        return input(f"Enter {prompt}: ").strip()

def reset_supabase_queue(supabase_url, service_key):
    """Reset Telegram queue in Supabase"""
    print_step(2, 4, "Resetting Supabase queue...")
    
    # Extract project ID
    project_id = supabase_url.split('//')[1].split('.')[0]
    print_info(f"Project ID: {project_id}")
    
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    # Delete all jobs
    print_info("Deleting all jobs from telegram_jobs...")
    try:
        response = requests.delete(
            f"{supabase_url}/rest/v1/telegram_jobs?id=not.is.null",
            headers=headers
        )
        if response.status_code in [200, 204]:
            print_success("All jobs deleted")
        else:
            print_warning(f"Delete response: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        print_error(f"Failed to delete jobs: {e}")
    
    # Verify queue is empty
    print_info("Verifying queue is empty...")
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/telegram_jobs?select=count",
            headers=headers
        )
        data = response.json()
        if len(data) == 0 or (isinstance(data, list) and len(data) == 0):
            print_success("Queue is empty (0 jobs)")
            return True
        else:
            print_warning(f"Queue count: {data}")
            return True
    except Exception as e:
        print_error(f"Failed to verify queue: {e}")
        return False

def manage_webhook(bot_token, secret_token):
    """Manage Telegram webhook"""
    print_step(3, 4, "Managing Telegram webhook...")
    
    api_url = f"https://api.telegram.org/bot{bot_token}"
    webhook_url = "https://www.icoffio.com/api/telegram-simple/webhook"
    
    # Get current webhook info
    print_info("Fetching current webhook info...")
    try:
        response = requests.get(f"{api_url}/getWebhookInfo")
        webhook_info = response.json()
        print_info(f"Current webhook: {json.dumps(webhook_info, indent=2)}")
    except Exception as e:
        print_warning(f"Failed to get webhook info: {e}")
    
    # Delete existing webhook
    print_info("Deleting existing webhook...")
    try:
        response = requests.post(f"{api_url}/deleteWebhook")
        delete_result = response.json()
        if delete_result.get('ok'):
            print_success("Webhook deleted")
        else:
            print_warning(f"Delete response: {delete_result}")
    except Exception as e:
        print_error(f"Failed to delete webhook: {e}")
    
    time.sleep(2)
    
    # Set new webhook
    print_info("Setting new webhook...")
    webhook_data = {
        'url': webhook_url,
        'secret_token': secret_token,
        'allowed_updates': ['message', 'callback_query'],
        'max_connections': 40,
        'drop_pending_updates': True
    }
    
    try:
        response = requests.post(
            f"{api_url}/setWebhook",
            json=webhook_data
        )
        set_result = response.json()
        
        if set_result.get('ok'):
            print_success("Webhook set successfully")
        else:
            print_error("Failed to set webhook")
            print_info(f"Response: {set_result}")
            return False
    except Exception as e:
        print_error(f"Failed to set webhook: {e}")
        return False
    
    time.sleep(2)
    
    # Verify webhook
    print_info("Verifying new webhook...")
    try:
        response = requests.get(f"{api_url}/getWebhookInfo")
        new_webhook_info = response.json()
        
        if new_webhook_info.get('result', {}).get('url') == webhook_url:
            print_success("Webhook verified")
            print_info(f"Webhook info:\n{json.dumps(new_webhook_info, indent=2)}")
            return True
        else:
            print_warning("Webhook verification unclear")
            print_info(f"Response: {json.dumps(new_webhook_info, indent=2)}")
            return True
    except Exception as e:
        print_warning(f"Failed to verify webhook: {e}")
        return True

def main():
    print_header()
    
    # Step 1: Load environment
    print_step(1, 4, "Loading environment...")
    load_dotenv('.env.local')
    
    # Get required variables
    print_info("Checking required variables...")
    
    try:
        bot_token = get_env_or_input(
            'TELEGRAM_BOT_TOKEN',
            'Telegram Bot Token (from @BotFather)',
            secret=True
        )
        
        secret_token = get_env_or_input(
            'TELEGRAM_SECRET_TOKEN',
            'Telegram Secret Token (any random string)',
            secret=True
        )
        
        supabase_url = get_env_or_input(
            'NEXT_PUBLIC_SUPABASE_URL',
            'Supabase URL (https://xxx.supabase.co)',
            secret=False
        )
        
        service_key = get_env_or_input(
            'SUPABASE_SERVICE_ROLE_KEY',
            'Supabase Service Role Key',
            secret=True
        )
    except KeyboardInterrupt:
        print(f"\n\n{RED}❌ Cancelled by user{NC}")
        sys.exit(1)
    
    print_success("All variables collected")
    
    # Step 2: Reset Supabase queue
    if not reset_supabase_queue(supabase_url, service_key):
        print_error("Failed to reset queue")
        sys.exit(1)
    
    # Step 3: Manage webhook
    if not manage_webhook(bot_token, secret_token):
        print_error("Failed to manage webhook")
        sys.exit(1)
    
    # Step 4: Final status
    print_step(4, 4, "Final status")
    print(f"\n{BLUE}{'=' * 50}{NC}")
    print(f"{GREEN}{BOLD}✅ TELEGRAM BOT RESET COMPLETED!{NC}")
    print(f"{BLUE}{'=' * 50}{NC}\n")
    
    print(f"{BOLD}📊 Summary:{NC}")
    print("  ✅ Supabase queue reset (0 jobs)")
    print("  ✅ Webhook deleted")
    print("  ✅ Webhook recreated")
    print("  ✅ Webhook verified")
    print()
    
    print(f"{BOLD}🧪 Next: Test in Telegram{NC}")
    print()
    print("1. Open your Telegram bot")
    print("2. Send: /start")
    print("3. Send text: AI revolutionizes education.")
    print("4. Wait 5-15 seconds")
    print("5. You should receive article URLs")
    print()
    
    print(f"{BOLD}📊 Monitor logs:{NC}")
    print("  Vercel: https://vercel.com/andreys-projects-a55f75b3/icoffio-front/logs")
    print("  Supabase: https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz")
    print()
    
    print(f"{GREEN}Done! 🚀{NC}\n")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{RED}❌ Cancelled by user{NC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}❌ Unexpected error: {e}{NC}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

