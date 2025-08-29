# Codeloccol Platform (MVP)

Stack: **Node.js + Express + MongoDB (Mongoose)** for the API, **Next.js/React** for the frontend.

## Quick start

### 1) Backend
```bash
cd backend
cp .env.example .env
# Edit .env then
npm install
npm run dev
```

### 2) Frontend
```bash
cd ../frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:4000/api` by default (configurable via `NEXT_PUBLIC_API_URL`).

## Features included
- JWT auth (login/register), roles: apprenant, staff, admin
- Project submission via GitHub URL, review by 2 peers + staff, staff validation required to unlock next project
- Days remaining tracked **server-side**, extended (+1/+2/+3) on validation
- Auto-block account after 4 days inactivity (server cron), staff-only manual unblock
- Hackathon space (create, list, join, submit via GitHub)
- Notifications (in-app + email stub)
