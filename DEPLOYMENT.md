# TaskFlow — Deployment Guide

Two supported deployment shapes. Pick one.

---

## Option A — Separate Frontend & Backend (Recommended)

Best for: Vercel/Netlify (frontend) + Render/Railway/Fly.io (backend). 
Scales independently, simpler CI, standard for most teams.

### 1. Deploy the Backend (`server/`)

**Render (Example):**
1. Click **New** → **Web Service** → connect your repository.
2. Set **Root directory** to `server`.
3. Set **Build command** to `npm install`.
4. Set **Start command** to `npm start`.
5. Add the following environment variables (Render dashboard → Environment):

| Variable | Value / Description |
| :--- | :--- |
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your frontend URL once deployed (e.g., `https://taskflow.vercel.app`). *Note: Add this after step 2, then redeploy.* |
| `SERVE_CLIENT` | `false` |

6. **Deploy**. Note the backend URL (e.g., `https://taskflow-api.onrender.com`).

### 2. Deploy the Frontend (`client/`)

**Vercel (Example):**
1. Click **New Project** → import your repository.
2. Set **Root directory** to `client`.
3. Set **Framework preset** to Vite.
4. Set **Build command** to `npm run build`.
5. Set **Output directory** to `dist`.
6. Add the following environment variables:

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://taskflow-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://taskflow-api.onrender.com` |

7. **Deploy**. Note the frontend URL (e.g., `https://taskflow.vercel.app`).

### 3. Close the Loop

Go back to the backend's `CLIENT_URL` environment variable and set it to the frontend URL from step 2. Redeploy the backend. CORS and Socket.IO will now allow that origin.

### 4. Seed Production Data (One-Time)

Run this locally, pointed at your production database:

```bash
cd server
MONGODB_URI="<your_atlas_uri>" node utils/seed.js
```

> **Important:** Change the default seed passwords immediately after your first login, or remove the seed script's default accounts entirely before going live.

---

## Option B — Single Service (Server serves built client)

Best for: A single Render/Railway service, simplest infrastructure, same-origin (no CORS issues).

### 1. Build the Client

```bash
cd client
npm install
npm run build
```
*(Produces `client/dist/`)*

### 2. Configure the Server Environment

Set the following in your deployment environment (or `server/.env`):

| Variable | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `SERVE_CLIENT` | `true` |
| `CLIENT_URL` | `https://your-app.onrender.com` *(Must match deployed URL)* |
| `MONGODB_URI` | `<your_atlas_uri>` |
| `JWT_SECRET` | `<long_random_string>` |

With `SERVE_CLIENT=true`, Express serves `client/dist` as static files and falls back to `index.html` for any non-`/api` route (SPA routing).

### 3. Configure the Client Environment

In `client/.env.production` (used during `npm run build`):

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `/api` |
| `VITE_SOCKET_URL` | *(Leave blank)* |

*Relative paths mean the client talks to whatever origin served it.*

### 4. Deploy

**Render (Single Service Example):**
1. Click **New** → **Web Service** → connect your repository.
2. Set **Root directory** to your repo root (leave blank, do not use `server` or `client`).
3. Set **Build command**:
   ```bash
   cd client && npm install && npm run build && cd ../server && npm install
   ```
4. Set **Start command**: 
   ```bash
   cd server && npm start
   ```
5. Set the environment variables from step 2 above and deploy.

---

## Pre-Deployment Checklist

- [ ] `server/.env` — `MONGODB_URI` points to your production Atlas cluster (not localhost).
- [ ] `JWT_SECRET` is a strong, unique value (not the example placeholder).
- [ ] MongoDB Atlas Network Access allows your backend host's IP (or `0.0.0.0/0` if using a PaaS with dynamic IPs).
- [ ] `CLIENT_URL` in the backend exactly matches your deployed frontend's origin (includes `https://`, no trailing slash).
- [ ] Default seed user passwords changed or seed accounts removed.
- [ ] `NODE_ENV=production` is set (disables stack traces in error responses).
- [ ] Frontend `VITE_API_URL` / `VITE_SOCKET_URL` point to the correct backend origin.
- [ ] Tested the full flow end-to-end on the deployed URLs: register → login → admin creates room → assigns member → member completes task → real-time update appears.

---

## Post-Deployment Smoke Test

```bash
# 1. Health check
curl https://your-backend-url/api/health
# Expected Output: {"status":"ok","timestamp":"...","env":"production"}

# 2. Register a test user
curl -X POST https://your-backend-url/api/api/auth/register   -H "Content-Type: application/json"   -d '{"username":"smoketest","password":"test1234"}'

# 3. Open the frontend URL in a browser, log in, and confirm:
#    - Dashboard loads
#    - Socket connects (green dot in navbar)
#    - Completing a task updates instantly
#    - Opening the same room in two browser tabs shows real-time sync
```

---

## Common Issues

| Symptom | Diagnosis & Solution |
| :--- | :--- |
| **CORS errors in browser console** | `CLIENT_URL` on the backend doesn't exactly match the frontend origin. Check for `http` vs `https`, trailing slashes, and `www` vs non-`www` mismatches. |
| **Socket connects but `join_room` fails silently** | Check that `VITE_SOCKET_URL` doesn't include a path segment like `/api`. Socket.IO needs the bare origin (it appends `/socket.io` itself). |
| **"Network Error" on all API calls** | `VITE_API_URL` is wrong, or the backend isn't running. Check the backend's `/api/health` endpoint directly first to isolate frontend vs. backend issues. |
| **MongoDB connection timeout** | Atlas Network Access list doesn't include your backend's IP. For PaaS providers with dynamic IPs, allow `0.0.0.0/0` (standard for serverless/PaaS). |