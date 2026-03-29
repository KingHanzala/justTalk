# JustTalk

<p align="center">
  <strong>Verified real-time chat for direct messages and groups.</strong><br />
  FastAPI + React + PostgreSQL + WebSockets, with Docker and GitHub Actions deployment support.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#environment">Environment</a> •
  <a href="#production">Production</a> •
  <a href="#cicd">CI/CD</a> •
  <a href="#troubleshooting">Troubleshooting</a>
</p>

---

## Features

JustTalk currently includes:

- Email-verification-first auth flow
- Case-insensitive username identity
- Direct messages and group chats
- Group admin roles
- Add/remove members for existing groups
- Soft-delete messages for everyone
- Read-only removed-member history
- Unread counts and unread chat highlighting
- Real-time delivery over WebSockets
- Typing indicators for DMs and groups

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React, Vite, TypeScript, TanStack Query, Zustand |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Realtime | WebSockets |
| Dev Infra | Docker Compose |
| Prod Infra | GHCR images, nginx, GitHub Actions |

## Project Layout

```text
frontend/   Vite React client
backend/    FastAPI app, Alembic migrations, tests
nginx/      Production web server and frontend hosting image
.github/    CI/CD workflows
```

## Quick Start

### Option 1: Docker Compose

This is the fastest way to run JustTalk locally.

```bash
docker compose up --build
```

Local URLs:

- App: `http://localhost:5173`
- API: `http://localhost:8000`
- API health: `http://localhost:8000/api/health`

Stop the stack:

```bash
docker compose down
```

Reset local database volume if needed:

```bash
docker compose down -v
```

### Option 2: Run Backend and Frontend Separately

#### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Local frontend env:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## Environment

### Backend

Important variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL or SQLite connection string |
| `SECRET_KEY` | JWT signing secret |
| `ALLOWED_ORIGINS` | Allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT lifetime |
| `RESEND_API_KEY` | Resend API key for verification emails |
| `EMAIL_FROM` | Sender identity for verification emails |
| `EMAIL_REPLY_TO` | Optional reply-to address |
| `APP_BASE_URL` | Frontend base URL |
| `VERIFICATION_CODE_EXPIRE_MINUTES` | Code expiry window |
| `VERIFICATION_CODE_RESEND_SECONDS` | Resend cooldown |

### Frontend

Use frontend env vars only for standalone frontend development. In production, nginx serves the built frontend and proxies API and WebSocket traffic on the same origin.

---

## Email Verification Setup

JustTalk now requires verified users before chat access.

### Resend Setup

For development, the backend can still run without a live mail sender, but in production you should configure Resend:

1. Create a free account at Resend.
2. Generate an API key.
3. Verify a sending domain in Resend.
4. Add the DNS records Resend provides.
5. Set these values in `backend/.env`:

```env
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=JustTalk <onboarding@your-domain.com>
EMAIL_REPLY_TO=support@your-domain.com
APP_BASE_URL=https://your-domain.com
```

Notes:

- Unverified users can sign up and resume verification later.
- Login for unverified users routes them into verification, not full chat access.
- WebSocket and authenticated chat access are blocked until verification completes.

---

## Production

The repo includes an image-based production flow.

### What production expects

- A VM/server with Docker and Docker Compose plugin
- A `backend/.env` file on the server
- A PostgreSQL database
- `docker-compose.prod.yml` present on the server
- GHCR image pull access

### Production server layout

Recommended server path:

```bash
/home/<user>/chat-app
```

Expected file:

```bash
/home/<user>/chat-app/backend/.env
```

### Start production manually

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Production notes

- [docker-compose.prod.yml] uses prebuilt images, not local source builds.
- The current production compose expects an external PostgreSQL database.
- nginx serves the frontend and proxies `/api` and `/api/ws`.
- HTTPS is designed to terminate directly in nginx on the VM.
- nginx runs in two modes:
  - bootstrap HTTP mode before certificates exist
  - full TLS mode after Let’s Encrypt certs are present

### Custom Domain and HTTPS

Recommended production env values:

```env
APP_DOMAIN=justtalk.hanza.la
APP_WWW_DOMAIN=www.justtalk.hanza.la
APP_CANONICAL_HOST=justtalk.hanza.la
```

Target hosts are driven from env now, not hardcoded into the nginx image.

DNS records:

- `A` or `AAAA` for `justtalk.hanza.la` pointing to your VM
- `A` or `AAAA` for `www.justtalk.hanza.la` pointing to your VM

VM/firewall ports:

- `80/tcp`
- `443/tcp`

Server directories required:

```bash
/home/hanzala_sabir/chat-app
/home/hanzala_sabir/chat-app/backend/.env
/var/www/certbot
/etc/letsencrypt
```

Update `backend/.env` on the VM:

```env
ALLOWED_ORIGINS=https://justtalk.hanza.la,https://www.justtalk.hanza.la
APP_BASE_URL=https://justtalk.hanza.la
APP_DOMAIN=justtalk.hanza.la
APP_WWW_DOMAIN=www.justtalk.hanza.la
APP_CANONICAL_HOST=justtalk.hanza.la
EMAIL_FROM=JustTalk <noreply@justtalk.hanza.la>
EMAIL_REPLY_TO=JustTalk <noreply@justtalk.hanza.la>
```

### First-Time HTTPS Bootstrap

1. Deploy the updated production stack.
2. Ensure DNS for both hosts points to the VM.
3. Create the ACME webroot on the VM:

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R $USER:$USER /var/www/certbot
```

4. Start the stack once so nginx comes up in bootstrap HTTP mode:

```bash
cd /home/hanzala_sabir/chat-app
docker compose -f docker-compose.prod.yml up -d
```

5. Install Certbot on the VM if needed and request certificates using the webroot flow:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d "$APP_DOMAIN" \
  -d "$APP_WWW_DOMAIN"
```

6. Restart nginx so it switches to TLS mode:

```bash
cd /home/hanzala_sabir/chat-app
docker compose -f docker-compose.prod.yml restart nginx
```

### Renewal

Verify renewal works:

```bash
sudo certbot renew --dry-run
```

After renewal, reload nginx:

```bash
cd /home/hanzala_sabir/chat-app
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Most Linux installs of Certbot already create a timer/cron job for renewals. Keep that enabled on the VM.

---

## CI/CD

### Continuous Integration
Runs on:

- `push`
- `pull_request`

Checks:

- Backend: `python -m pytest`
- Frontend: `npm run typecheck`
- Frontend: `npm run build`

### Continuous Deployment

Flow:

1. Build backend and nginx images
2. Push images to GHCR
3. Copy `docker-compose.prod.yml` to the server
4. SSH into the server
5. Pull images
6. Run `docker compose -f docker-compose.prod.yml up -d`
7. Verify with `http://localhost/api/health`

Required GitHub environment secrets:

- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`
- `DEPLOY_PATH`
- `GHCR_PAT`

The deploy job currently uses the GitHub environment:

- `ChatAppEnv`

---

## Common Commands

### Backend

```bash
cd backend
python3 -m pytest
alembic upgrade head
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm run build
```

### Docker

```bash
docker compose up --build
docker compose down
docker compose down -v
docker compose ps
docker compose logs -f backend
```

---

## Troubleshooting

<details>
<summary><strong>Backend exits during startup</strong></summary>

This is usually one of these:

- database not ready yet
- migration error
- bad `DATABASE_URL`
- missing required env vars

Check:

```bash
docker compose logs backend
docker compose logs db
```

</details>

---

## Version Notes

JustTalk v2 adds:

- verified-user auth
- case-insensitive username uniqueness
- unread chat ordering and counts
- typing indicators
- improved removed-member visibility rules
- updated JustTalk branding
