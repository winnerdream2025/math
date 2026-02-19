# Deployment Guide — Math & Fils Timesheet

## Prerequisites

- **Docker** 20+ & **Docker Compose** v2
- A PostgreSQL database (Supabase or self-hosted)
- SMTP credentials (Gmail App Password or similar)
- A domain name with DNS configured

---

## Option 1: Docker Compose (Recommended)

### 1. Clone & Configure

```bash
git clone <repo-url> && cd math

# Create env files from templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Fill in Production Values

**backend/.env** — the critical ones:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate-another-one>
CORS_ORIGIN=https://mathfils.org
FRONTEND_URL=https://mathfils.org
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Math & Fils" <noreply@mathfils.org>
```

**frontend/.env.local**:
```env
NEXT_PUBLIC_API_URL=https://api.mathfils.org/api/v1
```

### 3. Build & Launch

```bash
# Using Supabase (no local Postgres needed)
docker compose --profile production up -d --build

# Self-hosted Postgres
docker compose --profile production --profile self-hosted up -d --build
```

### 4. Verify

```bash
# Check health
curl http://localhost:3001/health
# → {"status":"ok","timestamp":"..."}

# Check logs
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Option 2: Manual / VPS Deployment

### Backend

```bash
cd backend
npm ci
npm run build
NODE_ENV=production node dist/main.js
```

Use **PM2** for process management:
```bash
npm install -g pm2
pm2 start dist/main.js --name mathfils-api -i max
pm2 save
pm2 startup
```

### Frontend

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=https://api.mathfils.org/api/v1 npm run build
npm run start
```

With PM2:
```bash
pm2 start npm --name mathfils-web -- start
```

---

## Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/mathfils
server {
    listen 80;
    server_name mathfils.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mathfils.org;

    ssl_certificate     /etc/letsencrypt/live/mathfils.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mathfils.org/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001;
    }
}
```

### SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mathfils.org
```

---

## Database

### Using Supabase (current setup)
No additional setup needed. The `DATABASE_URL` in `.env` points to Supabase's connection pooler.

### Self-hosted PostgreSQL
```bash
# Create database
createdb -U postgres timesheet

# Run seed (creates admin user)
cd backend && npm run seed
```

**Important:** `synchronize: true` is **disabled** in production. Use migrations:
```bash
cd backend
npm run migration:run
```

---

## Post-Deployment Checklist

- [ ] JWT_SECRET is a strong random value (not the dev default)
- [ ] JWT_REFRESH_SECRET is a different strong random value
- [ ] DATABASE_URL points to production database
- [ ] CORS_ORIGIN matches your exact frontend domain
- [ ] FRONTEND_URL matches your exact frontend domain (for email links)
- [ ] SMTP credentials are configured and tested
- [ ] Admin default password has been changed
- [ ] SSL/TLS is enabled (HTTPS)
- [ ] Swagger is automatically disabled (`NODE_ENV=production`)
- [ ] Health check responds: `GET /health → 200`
- [ ] Backups configured for the database
- [ ] Logs are being collected (Docker logs / PM2 logs)

---

## Monitoring

```bash
# Docker
docker compose ps
docker compose logs -f --tail=100

# PM2
pm2 monit
pm2 logs

# Health check (use with uptime monitoring)
curl -sf http://localhost:3001/health
```

---

## Updating

```bash
git pull origin main

# Docker
docker compose --profile production up -d --build

# Manual
cd backend && npm ci && npm run build && pm2 restart mathfils-api
cd ../frontend && npm ci && npm run build && pm2 restart mathfils-web
```
