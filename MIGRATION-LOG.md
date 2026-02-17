# ICOFFIO VPS Migration Log

## Rules (agreed)
1. **One executor**: Only Claude makes changes. User does not push/deploy in parallel.
2. **Staging first**: Use `web.icoffio.com` — do NOT touch `app`/`www` until approved.
3. **Phased DNS cutover**: First `app`, then `www` after 24-48h.
4. **Vercel rollback**: Keep Vercel active for minimum 7 days after cutover.
5. **Single migration log**: This file tracks all commands, configs, and changes.

---

## Phase 0: VPS Assessment (2026-02-17)

### System Info
```
uname -a: Linux ubuntu-8gb-nbg1-2 6.8.0-71-generic x86_64
OS:        Ubuntu 24.04.3 LTS (Noble Numbat)
RAM:       7.6 GiB total, ~4.6 GiB available
Disk:      75 GB total, 40 GB available (46% used)
Docker:    29.2.1
Git:       2.43.0
Certbot:   2.9.0
```

### Port Map
| Port | Process | Notes |
|------|---------|-------|
| 22   | sshd | SSH |
| 80   | docker-proxy → nginx_server | HTTP (Nginx in Docker) |
| 443  | docker-proxy → nginx_server | HTTPS (Nginx in Docker) |
| 3000 | docker-proxy → aiw-metabase | 127.0.0.1 only |
| 4200 | **Next.js (icoffio)** | **NEW — 127.0.0.1 only** |
| 5432 | docker-proxy → aiw-postgres | 127.0.0.1 only |
| 6379 | docker-proxy → aiw-redis | 127.0.0.1 only |
| 7633 | flask_wine container (internal) | Wine app |
| 9000 | docker-proxy → aiw-minio | 127.0.0.1 only |
| 9001 | docker-proxy → aiw-minio console | 127.0.0.1 only |
| 17071| python (AI Wardrobe API) | 127.0.0.1 only |

### Docker Containers Running
| Name | Image | Purpose |
|------|-------|---------|
| nginx_server | nginx:latest | Reverse proxy (80/443) |
| flask_wine-web-1 | wine_flask | Wine assistant app |
| textivox-bot | textivox:latest | Telegram bot |
| aiw-metabase | metabase/metabase | Analytics dashboard |
| aiw-postgres | postgres:16-alpine | Database |
| aiw-redis | redis:7-alpine | Cache |
| aiw-minio | minio/minio | Object storage |

### Architecture
```
Internet → :443 → Docker Nginx → 172.17.0.1:4200 → Next.js (host, PM2)
```

---

## Phase 1: Deployment (2026-02-17)

### Step 1: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
# Result: node v20.20.0, npm 10.8.2
```

### Step 2: Install PM2
```bash
npm install -g pm2
pm2 startup systemd -u root --hp /root
# Result: pm2 6.0.14, systemd autostart configured
```

### Step 3: Clone repository
```bash
mkdir -p /root/projects/icoffio-front
cd /root/projects/icoffio-front
git clone https://github.com/Warlockus-prod/icoffio-front.git .
# Result: commit 511aed3 (latest)
```

### Step 4: Configure .env.production
```bash
# Pulled from Vercel production via: npx vercel env pull
# Adapted: NEXT_PUBLIC_SITE_URL=https://web.icoffio.com
```
**Variables (27 total, keys only):**
```
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://web.icoffio.com
NEXT_PUBLIC_APP_URL=https://web.icoffio.com
NEXT_PUBLIC_SUPABASE_URL=***
SUPABASE_URL=***
SUPABASE_SERVICE_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
OPENAI_API_KEY=***
TELEGRAM_BOT_TOKEN=***
TELEGRAM_BOT_SECRET=***
TELEGRAM_CHAT_ID=***
TELEGRAM_WORKER_SECRET=***
CRON_SECRET=***
ADMIN_PASSWORD=***
NEXT_PUBLIC_ADMIN_PASSWORD=***
REVALIDATE_TOKEN=***
NEXT_PUBLIC_GA_ID=G-35P327PYGH
UNSPLASH_ACCESS_KEY=***
BLOB_READ_WRITE_TOKEN=***
WORDPRESS_API_URL=*** (legacy)
WORDPRESS_USERNAME=*** (legacy)
WORDPRESS_APP_PASSWORD=*** (legacy)
NEXT_PUBLIC_WP_ENDPOINT=*** (legacy)
```

### Step 5: Build
```bash
npm install   # 418 packages, 11s
npm run build # Next.js 14.2.35, compiled successfully, 35 pages
```
**Build output:** 35 routes, all ƒ (dynamic), 1 warning (telegram/stats - non-critical)

### Step 6: PM2 Ecosystem
**File:** `/root/projects/icoffio-front/ecosystem.config.js`
```javascript
module.exports = {
  apps: [{
    name: 'icoffio-front',
    script: 'node_modules/.bin/next',
    args: 'start -p 4200',
    cwd: '/root/projects/icoffio-front',
    env: { NODE_ENV: 'production', PORT: 4200 },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/root/projects/icoffio-front/logs/error.log',
    out_file: '/root/projects/icoffio-front/logs/out.log',
    merge_logs: true
  }]
};
```
```bash
pm2 start ecosystem.config.js
pm2 save
# Result: online, ready in 263ms, ~91MB RAM
```

### Step 7: Nginx Server Block
**File modified:** `/opt/repos/flask_wine/docker-compose.yml`
- Added 1 line: `- /opt/repos/icoffio/icoffio.conf:/etc/nginx/conf.d/icoffio.conf`
- Backup: `/opt/repos/flask_wine/docker-compose.yml.bak`

**File created:** `/opt/repos/icoffio/icoffio.conf`
```nginx
server {
    listen 80;
    server_name web.icoffio.com;
    location /.well-known/acme-challenge/ { root /etc/ssl/certs; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    server_name web.icoffio.com;

    ssl_certificate /etc/ssl/certs/web.icoffio.com.crt;
    ssl_certificate_key /etc/ssl/private/web.icoffio.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 20M;
    proxy_connect_timeout 120;
    proxy_send_timeout 120;
    proxy_read_timeout 120;

    location / {
        proxy_pass http://172.17.0.1:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
cd /opt/repos/flask_wine && docker compose up -d nginx
# Result: nginx_server Recreated, config test OK
```

### Step 8: SSL Certificate
```bash
certbot certonly --webroot -w /opt/repos/certs/certs -d web.icoffio.com \
  --non-interactive --agree-tos --email admin@icoffio.com
# Result: Certificate issued, expires 2026-05-18

cp /etc/letsencrypt/live/web.icoffio.com/fullchain.pem /opt/repos/certs/certs/web.icoffio.com.crt
cp /etc/letsencrypt/live/web.icoffio.com/privkey.pem /opt/repos/certs/private/web.icoffio.com.key
docker exec nginx_server nginx -s reload
```

**Auto-renewal hook:** `/etc/letsencrypt/renewal-hooks/deploy/icoffio-reload.sh`
- Copies renewed certs to mounted dirs
- Reloads nginx in Docker

---

## Smoke Test Results (2026-02-17)

| Endpoint | Status | Time | Size |
|----------|--------|------|------|
| `https://web.icoffio.com/en` | ✅ 200 | 0.41s | 135 KB |
| `https://web.icoffio.com/pl` | ✅ 200 | 0.45s | 141 KB |
| `https://web.icoffio.com/en/admin` | ✅ 200 | 0.19s | 40 KB |
| `https://web.icoffio.com/api/activity-log/stats` | ✅ 200 | 0.53s | 703 B |
| `https://web.icoffio.com/en/articles` | ✅ 200 | 0.88s | 335 KB |
| RSC Navigation (`RSC: 1` header) | ✅ 200 | 0.49s | — |
| HTTP→HTTPS redirect | ✅ 301 | — | — |
| SSL Certificate | ✅ CN=web.icoffio.com, valid until 2026-05-18 |

---

## Files Changed on VPS

### NEW files (created by migration)
| Path | Purpose |
|------|---------|
| `/root/projects/icoffio-front/` | Next.js app (full clone) |
| `/root/projects/icoffio-front/.env.production` | Environment variables |
| `/root/projects/icoffio-front/ecosystem.config.js` | PM2 config |
| `/root/projects/icoffio-front/logs/` | PM2 log directory |
| `/opt/repos/icoffio/icoffio.conf` | Nginx server block |
| `/opt/repos/certs/certs/web.icoffio.com.crt` | SSL certificate |
| `/opt/repos/certs/private/web.icoffio.com.key` | SSL private key |
| `/etc/letsencrypt/live/web.icoffio.com/` | Certbot managed certs |
| `/etc/letsencrypt/renewal-hooks/deploy/icoffio-reload.sh` | Auto-renewal hook |

### MODIFIED files (existing, 1 line changed)
| Path | Change |
|------|--------|
| `/opt/repos/flask_wine/docker-compose.yml` | +1 volume mount for icoffio.conf |
| Backup at: `/opt/repos/flask_wine/docker-compose.yml.bak` | |

### System packages installed
| Package | Version |
|---------|---------|
| Node.js | v20.20.0 |
| npm | 10.8.2 |
| PM2 | 6.0.14 |

---

## ISOLATION GUARANTEE
- ✅ All icoffio files in `/root/projects/icoffio-front/`
- ✅ Nginx config as separate file `/opt/repos/icoffio/icoffio.conf`
- ✅ Only 1 line added to existing docker-compose.yml (volume mount)
- ✅ No modifications to `/opt/repos/flask_wine/nginx/nginx.conf` (original config)
- ✅ No modifications to `/root/projects/ai_wardrobe/`
- ✅ Other containers untouched: flask_wine, textivox-bot, aiw-*, metabase

---

## Blocker Fixes (2026-02-17, post-review)

### Fix 1 (P0): Nginx server blocks for app + www
- Added `app.icoffio.com` and `www.icoffio.com` server blocks (HTTP-only for now)
- SSL certs will be obtained AFTER DNS cutover via `certbot --webroot`
- Config: `/opt/repos/icoffio/icoffio.conf`

### Fix 2 (P0): Corrected cutover order
- Was: DNS → env → build (WRONG — causes downtime)
- Now: env → build → restart → DNS (zero downtime)

### Fix 3 (P1): Removed forced www redirect in site-url.ts
- Removed `LEGACY_HOSTS` set and normalization that forced all URLs to `www.icoffio.com`
- Now respects `NEXT_PUBLIC_SITE_URL` as-is from env
- File: `lib/site-url.ts`

### Fix 4 (P1): Secured .env.vercel-production
- Added `.env.vercel-production` to `.gitignore`
- File kept locally as backup, not tracked by git

---

## Cutover Procedure (correct order)

### Phase A: app.icoffio.com cutover
```
1. On VPS: Update .env.production → NEXT_PUBLIC_SITE_URL=https://app.icoffio.com
2. On VPS: npm run build
3. On VPS: pm2 restart icoffio-front
4. Verify: curl http://localhost:4200/en (200 OK)
5. DNS: Switch app.icoffio.com A-record → 46.225.11.249
6. Wait for DNS propagation (~5-15 min)
7. On VPS: certbot certonly --webroot -w /opt/repos/certs/certs -d app.icoffio.com
8. Copy certs + update nginx config to enable HTTPS for app
9. Reload nginx
10. Verify: https://app.icoffio.com/en, /pl, /admin, /api
```

### Phase B: www.icoffio.com cutover (24-48h after Phase A)
```
1. On VPS: Update .env.production → NEXT_PUBLIC_SITE_URL=https://www.icoffio.com
2. On VPS: npm run build && pm2 restart icoffio-front
3. DNS: Switch www.icoffio.com CNAME/A → 46.225.11.249
4. certbot + nginx SSL for www
5. Add www→app redirect or vice versa (canonical decision needed)
6. Verify all endpoints
```

### Phase C: Cleanup (7+ days after Phase B)
```
1. Disable Vercel deployment
2. Remove staging web.icoffio.com (optional, can keep as alias)
3. Update Telegram webhook URL
4. Update any external integrations
```
