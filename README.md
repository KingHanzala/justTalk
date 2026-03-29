# Chat App

Guide-aligned chat application with a React frontend, FastAPI backend, PostgreSQL, WebSocket messaging, Docker compose, and nginx reverse proxy support.

## Structure

- `frontend/`: standalone Vite React app
- `backend/`: FastAPI application, services, tests, and Alembic migrations
- `nginx/`: reverse proxy configuration for production

## How to start the application

There are 3 supported ways to run it:

1. Docker Compose for local development
2. Local backend + local frontend
3. Production with `docker-compose.prod.yml`

## Option 1: Start with Docker Compose

This is the easiest local setup because it starts PostgreSQL, the backend, and the frontend together.

```bash
docker compose up --build
```

Note:
If Docker reports `bind: address already in use` for `5432`, that means PostgreSQL is already running on your machine. The compose setup does not need to expose the database port to your host, so this project is configured to avoid that conflict.

App URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`

To stop:

```bash
docker compose down
```

## Option 2: Start locally without Docker

Use this if you want to run frontend and backend directly on your machine.

### 1. Start the backend

Open terminal 1:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
```

For local manual development, edit `backend/.env` and set `DATABASE_URL` to one of these:

- Local SQLite:

```env
DATABASE_URL=sqlite:///./chat_app.db
```

- Local PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chat_app
```

Then run:

```bash
alembic upgrade head
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:

- API: `http://localhost:8000`
- Health: `http://localhost:8000/health`

### 2. Start the frontend

Open terminal 2:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend will be available at:

- `http://localhost:5173`

## Option 3: Run in production

Production uses:

- `backend/.env` for backend runtime settings
- nginx to serve the built frontend and proxy `/api` and `/api/ws`
- same-origin frontend calls by default, so frontend production env vars are usually not required

Create the backend env file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` for production:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chat_app
SECRET_KEY=replace-with-a-long-random-secret
ALLOWED_ORIGINS=https://your-domain.com
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

Then start the production stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Production URLs:

- App: `http://your-domain/`
- API health: `http://your-domain/api/health`

Important notes:

- `docker-compose.prod.yml` expects an existing `backend/.env`
- the current production compose file assumes you are using an external PostgreSQL database
- port `443` is published, but nginx is not yet configured for TLS in this repo; use port `80` unless you add SSL config or terminate TLS before nginx

## Environment files

### Backend

Template: [backend/.env.example](/Users/kinghanzala/Downloads/ReplitExport-hanzalasabir/Prototype-Idea/backend/.env.example)

Important values:

- `DATABASE_URL`
- `SECRET_KEY`
- `ALLOWED_ORIGINS`
- `ACCESS_TOKEN_EXPIRE_MINUTES`

### Frontend

Template: [frontend/.env.example](/Users/kinghanzala/Downloads/ReplitExport-hanzalasabir/Prototype-Idea/frontend/.env.example)

Important values:

- `VITE_API_URL=http://localhost:8000`
- `VITE_WS_URL=ws://localhost:8000`

Use the frontend env file only for standalone frontend development. In production, nginx serves the built frontend and proxies API and WebSocket traffic on the same domain.

## Common commands

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run typecheck
```

Backend:

```bash
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python3 -m pytest
```

## Testing

```bash
cd backend && python3 -m pytest
cd frontend && npm run typecheck
```
