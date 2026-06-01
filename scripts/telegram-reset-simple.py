#!/usr/bin/env python3
"""
TELEGRAM BOT AUTOMATIC RESET (POSTGRESQL)
Simple version with JSON configuration.
"""

import json
import os
import subprocess
import sys
import time

import requests


def run_sql(sql: str, config: dict) -> str:
    database_url = (
        config.get("database", {}).get("url")
        or os.getenv("DATABASE_URL")
        or ""
    ).strip()

    if database_url:
        result = subprocess.run(
            ["psql", database_url, "-v", "ON_ERROR_STOP=1", "-tAc", sql],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "psql command failed")
        return result.stdout.strip()

    pg_cfg = config.get("database", {})
    pg_container = pg_cfg.get("container") or os.getenv("POSTGRES_CONTAINER") or "icoffio-postgres"
    pg_user = pg_cfg.get("user") or os.getenv("POSTGRES_USER") or "icoffio"
    pg_db = pg_cfg.get("db") or os.getenv("POSTGRES_DB") or "icoffio"
    pg_password = pg_cfg.get("password") or os.getenv("POSTGRES_PASSWORD") or ""

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


def main():
    print("\n" + "=" * 60)
    print("🚀 TELEGRAM BOT AUTOMATIC RESET (POSTGRESQL)")
    print("=" * 60 + "\n")

    print("📋 Step 1/4: Loading configuration...")
    config_file = "scripts/telegram-config.json"

    if not os.path.exists(config_file):
        print(f"❌ Config file not found: {config_file}")
        print("1. Copy: cp scripts/telegram-config.example.json scripts/telegram-config.json")
        print("2. Edit: scripts/telegram-config.json")
        print("3. Run this script again")
        sys.exit(1)

    with open(config_file, "r", encoding="utf-8") as f:
        config = json.load(f)

    bot_token = config["telegram"]["bot_token"]
    secret_token = config["telegram"]["secret_token"]
    webhook_base_url = (
        config.get("telegram", {}).get("webhook_base_url")
        or os.getenv("TELEGRAM_WEBHOOK_BASE_URL")
        or os.getenv("NEXT_PUBLIC_SITE_URL")
        or "https://web.icoffio.com"
    ).rstrip("/")

    if "YOUR_" in bot_token:
        print("❌ Please fill scripts/telegram-config.json with real Telegram values")
        sys.exit(1)

    print("✅ Configuration loaded")

    print("\n📋 Step 2/4: Resetting PostgreSQL queue...")
    try:
        run_sql("DELETE FROM telegram_jobs;", config)
        count = run_sql("SELECT COUNT(*) FROM telegram_jobs;", config)
        count_value = int((count or "0").strip())
        if count_value == 0:
            print("✅ Queue is empty (0 jobs)")
        else:
            print(f"⚠️ Queue still has {count_value} jobs")
    except Exception as exc:
        print(f"❌ Failed to reset queue: {exc}")
        sys.exit(1)

    print("\n📋 Step 3/4: Managing Telegram webhook...")
    api_url = f"https://api.telegram.org/bot{bot_token}"
    webhook_url = f"{webhook_base_url}/api/telegram-simple/webhook"

    try:
        response = requests.get(f"{api_url}/getWebhookInfo", timeout=20)
        info = response.json()
        current_url = info.get("result", {}).get("url", "none")
        print(f"Current webhook: {current_url}")

        response = requests.post(f"{api_url}/deleteWebhook", timeout=20)
        result = response.json()
        if result.get("ok"):
            print("✅ Webhook deleted")
        else:
            print(f"⚠️ Webhook delete response: {result}")

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
            print(f"❌ Failed to set webhook: {result}")
            sys.exit(1)
        print("✅ Webhook set successfully")

        time.sleep(2)
        response = requests.get(f"{api_url}/getWebhookInfo", timeout=20)
        info = response.json()
        new_url = info.get("result", {}).get("url", "")
        if new_url == webhook_url:
            print(f"✅ Webhook verified: {webhook_url}")
        else:
            print(f"⚠️ Webhook mismatch. Expected: {webhook_url}, got: {new_url}")
    except Exception as exc:
        print(f"❌ Webhook step failed: {exc}")
        sys.exit(1)

    print("\n📋 Step 4/4: Final status")
    print("\n✅ TELEGRAM BOT RESET COMPLETED!")
    print("Summary:")
    print("  ✅ PostgreSQL queue reset")
    print("  ✅ Webhook recreated and verified")
    print("\nDone! 🚀\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        sys.exit(1)
