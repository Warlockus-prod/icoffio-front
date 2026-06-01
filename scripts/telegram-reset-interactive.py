#!/usr/bin/env python3
"""
TELEGRAM BOT AUTOMATIC RESET (POSTGRESQL)
Interactive version with prompts.
"""

import getpass
import os
import subprocess
import sys
import time

import requests
from dotenv import load_dotenv

GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
BOLD = "\033[1m"
NC = "\033[0m"


def print_header():
    print(f"\n{BLUE}{'=' * 50}{NC}")
    print(f"{BOLD}🚀 TELEGRAM BOT AUTOMATIC RESET (POSTGRESQL){NC}")
    print(f"{BLUE}{'=' * 50}{NC}\n")


def print_step(step_num, total, message):
    print(f"\n{BLUE}📋 Step {step_num}/{total}: {message}{NC}")


def info(message):
    print(f"ℹ️  {message}")


def success(message):
    print(f"{GREEN}✅ {message}{NC}")


def warning(message):
    print(f"{YELLOW}⚠️  {message}{NC}")


def error(message):
    print(f"{RED}❌ {message}{NC}")


def get_env_or_input(var_name, prompt, secret=False, default_value=""):
    value = (os.getenv(var_name) or "").strip()
    if value:
        success(f"{var_name} loaded from environment")
        return value

    if default_value:
        raw = input(f"{prompt} [{default_value}]: ").strip()
        return raw or default_value

    if secret:
        return getpass.getpass(f"{prompt}: ").strip()
    return input(f"{prompt}: ").strip()


def run_sql(sql, database_url="", pg_container="icoffio-postgres", pg_user="icoffio", pg_db="icoffio", pg_password=""):
    if database_url:
        cmd = ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-tAc", sql]
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "psql command failed")
        return result.stdout.strip()

    cmd = ["docker", "exec"]
    if pg_password:
        cmd.extend(["-e", f"PGPASSWORD={pg_password}"])
    cmd.extend([
        "-i",
        pg_container,
        "psql",
        "-U",
        pg_user,
        "-d",
        pg_db,
        "-v",
        "ON_ERROR_STOP=1",
        "-tAc",
        sql,
    ])

    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "docker exec psql command failed")
    return result.stdout.strip()


def reset_postgres_queue(database_url="", pg_container="icoffio-postgres", pg_user="icoffio", pg_db="icoffio", pg_password=""):
    print_step(2, 4, "Resetting PostgreSQL queue...")
    run_sql("DELETE FROM telegram_jobs;", database_url, pg_container, pg_user, pg_db, pg_password)
    count_raw = run_sql("SELECT COUNT(*) FROM telegram_jobs;", database_url, pg_container, pg_user, pg_db, pg_password)
    count = int((count_raw or "0").strip())
    if count == 0:
        success("Queue is empty (0 jobs)")
    else:
        warning(f"Queue still contains {count} jobs")


def manage_webhook(bot_token, secret_token, webhook_base_url):
    print_step(3, 4, "Managing Telegram webhook...")
    api_url = f"https://api.telegram.org/bot{bot_token}"
    webhook_url = f"{webhook_base_url.rstrip('/')}/api/telegram-simple/webhook"

    response = requests.get(f"{api_url}/getWebhookInfo", timeout=20)
    info(f"Current webhook: {response.json().get('result', {}).get('url', 'none')}")

    response = requests.post(f"{api_url}/deleteWebhook", timeout=20)
    if response.json().get("ok"):
        success("Webhook deleted")
    else:
        warning(f"Delete response: {response.json()}")

    time.sleep(2)

    response = requests.post(
        f"{api_url}/setWebhook",
        json={
            "url": webhook_url,
            "secret_token": secret_token,
            "allowed_updates": ["message", "callback_query"],
            "max_connections": 40,
            "drop_pending_updates": True,
        },
        timeout=20,
    )
    result = response.json()
    if not result.get("ok"):
        raise RuntimeError(f"Failed to set webhook: {result}")
    success("Webhook set successfully")

    time.sleep(2)

    response = requests.get(f"{api_url}/getWebhookInfo", timeout=20)
    current = response.json().get("result", {}).get("url", "")
    if current == webhook_url:
        success("Webhook verified")
    else:
        warning(f"Webhook mismatch. Expected: {webhook_url}, got: {current}")


def main():
    print_header()
    load_dotenv(".env.local")
    load_dotenv(".env.production")

    print_step(1, 4, "Collecting settings...")

    bot_token = get_env_or_input(
        "TELEGRAM_BOT_TOKEN",
        "Telegram Bot Token",
        secret=True,
    )
    secret_token = get_env_or_input(
        "TELEGRAM_SECRET_TOKEN",
        "Telegram Secret Token",
        secret=True,
    )
    webhook_base_url = get_env_or_input(
        "TELEGRAM_WEBHOOK_BASE_URL",
        "Webhook base URL (e.g. https://web.icoffio.com)",
        default_value=os.getenv("NEXT_PUBLIC_SITE_URL", "https://web.icoffio.com"),
    )

    database_url = get_env_or_input("DATABASE_URL", "DATABASE_URL (leave empty to use Docker)", secret=False, default_value="")

    pg_container = "icoffio-postgres"
    pg_user = "icoffio"
    pg_db = "icoffio"
    pg_password = ""

    if not database_url:
        pg_container = get_env_or_input("POSTGRES_CONTAINER", "Postgres container name", default_value="icoffio-postgres")
        pg_user = get_env_or_input("POSTGRES_USER", "Postgres user", default_value="icoffio")
        pg_db = get_env_or_input("POSTGRES_DB", "Postgres database", default_value="icoffio")
        pg_password = get_env_or_input("POSTGRES_PASSWORD", "Postgres password (optional)", secret=True, default_value="")

    success("Settings collected")

    reset_postgres_queue(database_url, pg_container, pg_user, pg_db, pg_password)
    manage_webhook(bot_token, secret_token, webhook_base_url)

    print_step(4, 4, "Final status")
    print(f"\n{GREEN}{BOLD}✅ TELEGRAM BOT RESET COMPLETED!{NC}")
    print("Summary:")
    print("  ✅ PostgreSQL queue reset")
    print("  ✅ Webhook recreated and verified")
    print("\nDone! 🚀\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{RED}❌ Cancelled by user{NC}")
        sys.exit(1)
    except Exception as exc:
        print(f"\n{RED}❌ Error: {exc}{NC}")
        sys.exit(1)
