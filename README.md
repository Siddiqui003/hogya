# TaskFlow — Real-time Task Coordination

A full-stack web application where users in shared rooms can coordinate on a
shared task and see each other's completion status update live, in real time.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Quick Start](#quick-start)
4. [MongoDB Atlas Setup](#mongodb-atlas-setup)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Seeding the Database](#seeding-the-database)
7. [Available Scripts](#available-scripts)
8. [Architecture & Design Decisions](#architecture--design-decisions)
9. [API Reference](#api-reference)
10. [Socket.IO Event Reference](#socketio-event-reference)
11. [Frontend Pages & Routes](#frontend-pages--routes)
12. [Phase-by-Phase Summary](#phase-by-phase-summary)
13. [Testing Guide](#testing-guide)
14. [Multi-User Local Testing (Real-Time)](#multi-user-local-testing-real-time)
15. [Deployment](#deployment)
16. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React 18, Vite, React Router v6   |
| State       | Zustand                           |
| HTTP client | Axios                             |
| Real-time   | Socket.IO Client                  |
| Backend     | Node.js, Express.js               |
| Database    | MongoDB Atlas, Mongoose           |
| Auth        | JWT, bcryptjs                     |
| Real-time   | Socket.IO (server)                |

---

## Project Structure

```
taskflow/
├── package.json                  ← Root monorepo scripts
├── Procfile                       ← Heroku/Render process declaration
├── DEPLOYMENT.md                  ← Full deployment guide
├── README.md                      ← This file
├── .gitignore
│
├── server/
│   ├── index.js                   ← Express + Socket.IO entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js                  ← MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      ← register, login, profile
│   │   ├── adminController.js     ← room/member management (admin)
│   │   ├── roomController.js      ← user-facing room views
│   │   └── taskController.js      ← complete/reopen/status
│   ├── middleware/
│   │   └── auth.js                ← protect, requireRole
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js                ← embeds member completion status
│   │   └── Activity.js            ← append-only activity log
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rooms.js
│   │   ├── tasks.js
│   │   └── admin.js
│   ├── socket/
│   │   ├── socketHandler.js        ← main connection/event handler
│   │   ├── socketAuth.js           ← JWT verification on handshake
│   │   └── presence.js             ← in-memory online-user tracking
│   └── utils/
│       ├── jwt.js
│       ├── response.js
│       ├── roomCode.js
│       └── seed.js                 ← bootstrap admin + sample users
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    ├── .env.production.example
    └── src/
        ├── main.jsx
        ├── App.jsx                  ← routing, guards, global UI
        ├── index.css                ← design tokens / global styles
        ├── components/
        │   ├── common/
        │   │   ├── Button.jsx / .module.css
        │   │   ├── Input.jsx / .module.css
        │   │   ├── UI.jsx / .module.css      ← Badge, Avatar, Card, Alert, EmptyState, Spinner
        │   │   ├── ErrorBoundary.jsx / .module.css
        │   │   ├── SessionExpiredModal.jsx / .module.css
        │   │   ├── ConnectionBanner.jsx / .module.css
        │   │   └── ToastContainer.jsx / .module.css
        │   └── layout/
        │       ├── Navbar.jsx / .module.css
        │       └── AppLayout.jsx / .module.css
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── Auth.module.css           ← shared by Login/Register
        │   ├── DashboardPage.jsx / .module.css
        │   ├── RoomPage.jsx / .module.css
        │   ├── AdminPage.jsx / .module.css
        │   ├── NotFoundPage.jsx / .module.css
        │   └── UnauthorizedPage.jsx
        ├── store/                        ← Zustand
        │   ├── authStore.js
        │   ├── roomStore.js
        │   ├── socketStore.js
        │   └── toastStore.js
        ├── hooks/
        │   ├── useSocket.js               ← connection lifecycle + room join/leave
        │   └── useAuthInit.js             ← validates token on app load
        ├── services/                       ← Axios wrappers
        │   ├── api.js
        │   ├── authService.js
        │   ├── roomService.js
        │   └── taskService.js
        └── utils/
            └── date.js                     ← timeAgo, formatDateTime, activityLabel
```

---

## Quick Start

### Prerequisites

- Node.js v18+
- npm v9+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free M0 tier works)

### 1. Install dependencies

```bash
# From the taskflow/ root
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Configure environment variables

```bash
# Server
cd server
cp .env.example .env
# Edit .env:
#   MONGODB_URI — your Atlas connection string
#   JWT_SECRET  — any long random string (32+ chars)
cd ..

# Client
cd client
cp .env.example .env.local
# Defaults work for local development
cd ..
```

### 3. Seed the database (creates admin + sample users)

```bash
cd server
node utils/seed.js
cd ..
```

This creates:

| Username | Password    | Role  |
|----------|-------------|-------|
| `admin`  | `admin123`  | admin |
| `alice`  | `alice123`  | user  |
| `bob`    | `bob123`    | user  |
| `carol`  | `carol123`  | user  |

### 4. Run the app

```bash
# From taskflow/ root — runs both server and client
npm run dev
```

- Backend: http://localhost:5000 (health check at `/api/health`)
- Frontend: http://localhost:5173

### 5. First login

1. Open http://localhost:5173 → redirected to `/login`
2. Log in as `admin` / `admin123`
3. Go to **Admin** (top nav) → create a room, assign `alice`, `bob`, `carol` to it
4. Log out, log in as `alice` → see the room on the dashboard
5. Open the room, click **Mark complete** → status updates instantly

---

## MongoDB Atlas Setup

1. Create a free account at https://cloud.mongodb.com
2. Create a new **Shared** cluster (M0 free tier)
3. **Database Access** → add a user with username/password auth
4. **Network Access** → add IP `0.0.0.0/0` (fine for dev; tighten for prod)
5. **Connect** → **Connect your application** → copy the connection string
6. Replace `<username>`, `<password>`, `<cluster>` and set the database name to `taskflow` in `server/.env`'s `MONGODB_URI`

---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` — controls error verbosity |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWTs (32+ chars, random) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry (e.g. `7d`, `1h`, `10s`) |
| `CLIENT_URL` | No | `http://localhost:5173` | Comma-separated list of allowed frontend origins for CORS, e.g. `http://localhost:5173,http://localhost:5174,https://taskflow.example.com` |
| `SERVE_CLIENT` | No | `false` | If `true`, Express serves the built `client/dist` and falls back to `index.html` for SPA routing (single-service deploys) |

### Client (`client/.env.local` for dev, `client/.env.production` for builds)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `/api` | API base URL. Relative `/api` works with the Vite dev proxy and same-origin prod deploys |
| `VITE_SOCKET_URL` | No | `http://localhost:5000` (dev) | Socket.IO server URL. Leave empty (`VITE_SOCKET_URL=`) for same-origin prod deploys |

> **Note:** `CLIENT_URL` accepts **multiple comma-separated origins**. This is required if you run two frontend instances locally (e.g. ports `5173` and `5174` for multi-user real-time testing) — see [Multi-User Local Testing](#multi-user-local-testing-real-time).

---

## Seeding the Database

```bash
cd server
node utils/seed.js
```

- Safe to re-run — skips any username that already exists.
- **Change or remove these default accounts before deploying to production.**

---

## Available Scripts

From the **root** `taskflow/` directory:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both server (nodemon) and client (Vite) in parallel |
| `npm run server` | Start only the Express server |
| `npm run client` | Start only the Vite dev server |
| `npm run build` | Build the React app for production (`client/dist`) |
| `npm run install:all` | Install dependencies in root + server + client |
| `npm start` | Start the production server (`server/index.js`, no nodemon) |

From `client/`, to run a second frontend instance for multi-user testing:

```bash
npm run dev -- --port 5174
```

---

## Architecture & Design Decisions

### Completion status: embedded in the Room document

Each room's `members` array contains `{ user, isCompleted, completedAt, joinedAt }`.

**Why this fits the MVP:**
- One document read returns the room **and** every member's status — no joins
- Atomic updates via MongoDB's positional `$` operator: `{ 'members.$.isCompleted': true }` — no read-modify-write race conditions
- A single Socket.IO event (`task:completed`) carries everything clients need

**Tradeoffs at scale:**
- Embedded arrays grow with member count — fine for rooms with <100 members, less ideal for very large rooms
- Cross-room analytics ("all tasks user X has completed") would require scanning every room; a separate `TaskCompletion` collection would be better for that use case

For this MVP, embedded is the right call — see `server/models/Room.js`.

### Activity log: separate collection

`Activity` is its own collection (`server/models/Activity.js`), append-only, indexed on `{ room, createdAt }`. This keeps the `Room` document small regardless of history length, and supports the activity feed with simple time-sorted queries.

### Authentication

- Passwords hashed with bcrypt (cost factor 12) via a Mongoose `pre('save')` hook (`server/models/User.js`)
- JWTs signed with `JWT_SECRET`, verified by `protect` middleware (`server/middleware/auth.js`)
- Role-based access via `requireRole('admin')` guard
- Socket.IO connections are authenticated on handshake (`server/socket/socketAuth.js`) — no anonymous sockets

### Real-time architecture

- REST endpoints (`taskController.js`) perform the DB write **and** call `req.io.to(roomId).emit(...)` to broadcast
- `socketHandler.js` only manages room subscriptions (`join_room`/`leave_room`) and online presence — it does not duplicate business logic
- Presence is tracked **in-memory** per server instance (`server/socket/presence.js`). For multi-server/horizontal scaling, swap this for a Redis-backed adapter (the file includes notes on this)

### Frontend state & real-time sync

- `roomStore.js` applies **optimistic updates**: clicking "Mark complete" updates the UI instantly, then reconciles with the server response; on failure it rolls back to a snapshot
- `useSocket.js` listens for `task:completed`, `task:reopened`, `task:reset`, `member:joined`, `member:left`, and `presence:update`, patching the store directly so all open tabs/rooms stay in sync without polling
- On socket reconnect, `refreshMyRooms()` / `refreshCurrentRoom()` silently re-fetch from the API to catch any events missed while offline
- `ConnectionBanner` shows a "Connection lost / Reconnected" indicator — but only while authenticated, since `/login` never has a socket connection
- `ToastContainer` surfaces real-time events from *other* users (your own actions get instant optimistic feedback instead)

### CORS for multiple origins

`server/index.js` parses `CLIENT_URL` as a comma-separated list and uses a **dynamic origin callback** for both Express's `cors()` and Socket.IO's CORS config — this is required because `Access-Control-Allow-Origin` must echo back a single matching origin, not a literal comma-joined list (which browsers reject).

---

## API Reference

All endpoints are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | Public | Create account (`username`, `password`, `displayName?`) |
| `POST` | `/login` | Public | Returns `{ token, user }` |
| `GET` | `/me` | 🔒 | Current user profile |
| `PATCH` | `/me` | 🔒 | Update `displayName` |
| `PATCH` | `/me/password` | 🔒 | Change password (`currentPassword`, `newPassword`) |

### Rooms — user-facing (`/api/rooms`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | 🔒 | All rooms the current user belongs to, with `myStatus` |
| `GET` | `/:id` | 🔒 | Single room (members + statuses) — must be a member |
| `GET` | `/code/:code` | 🔒 | Look up a room by its join code |
| `GET` | `/:id/members` | 🔒 | Member list with completion status |
| `GET` | `/:id/activity` | 🔒 | Room activity feed (default 30 most recent) |

### Tasks (`/api/tasks`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/:roomId/complete` | 🔒 | Mark **your** task complete (409 if already done) |
| `POST` | `/:roomId/reopen` | 🔒 | Undo your completion |
| `GET` | `/:roomId/status` | 🔒 | Your own status in a room |
| `GET` | `/:roomId/all-statuses` | 🔒 | All members' statuses + completion summary |
| `POST` | `/:roomId/reset` | 🔒 Admin | Reset all member statuses in a room |

### Admin (`/api/admin`) — all require 🔒 + `role: admin`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List all users (search via `?search=`) |
| `POST` | `/rooms` | Create a room (`name`, `taskName`, `description?`, `code?`) |
| `GET` | `/rooms` | List all rooms, paginated (`?page=&limit=&search=`) |
| `GET` | `/rooms/:id` | Room detail |
| `PATCH` | `/rooms/:id` | Update room fields |
| `DELETE` | `/rooms/:id` | Soft-delete (`isActive: false`) |
| `POST` | `/rooms/:id/members` | Add user to room (`{ userId }`) |
| `DELETE` | `/rooms/:id/members/:userId` | Remove user from room |
| `GET` | `/rooms/:id/activity` | Full activity log for a room |

### Health

```bash
GET /api/health
→ { "status": "ok", "timestamp": "...", "env": "development" }
```

---

## Socket.IO Event Reference

Connect with: `io(SOCKET_URL, { auth: { token: 'Bearer <jwt>' } })`

### Client → Server

| Event | Payload | Description |
|-------|---------|--------------|
| `join_room` | `{ roomId }` | Subscribe to a room's live updates (server verifies membership) |
| `leave_room` | `{ roomId }` | Unsubscribe |
| `ping` | — | Keepalive |

### Server → Client

| Event | Payload | Trigger |
|-------|---------|---------|
| `joined_room` | `{ roomId, onlineUsers }` | Ack after `join_room` |
| `left_room` | `{ roomId }` | Ack after `leave_room` |
| `task:completed` | `{ roomId, userId, user, isCompleted, completedAt, activity }` | Any member completes their task |
| `task:reopened` | `{ roomId, userId, user, isCompleted, completedAt, activity }` | Any member reopens their task |
| `task:reset` | `{ roomId }` | Admin resets all statuses |
| `member:joined` | `{ roomId, user }` | Admin adds a member |
| `member:left` | `{ roomId, userId }` | Admin removes a member |
| `presence:update` | `{ roomId, onlineUsers, count }` | Online users in a room changed |
| `error` | `{ message }` | Validation/auth error on a socket event |
| `pong` | `{ timestamp }` | Response to `ping` |

---

## Frontend Pages & Routes

| Path | Access | Page | Notes |
|------|--------|------|-------|
| `/login` | Public | Login | Redirects to `/dashboard` if already authenticated |
| `/register` | Public | Register | Same redirect behavior |
| `/dashboard` | 🔒 Authenticated | Dashboard | Grid of your rooms with progress bars |
| `/rooms/:id` | 🔒 Authenticated + member | Room detail | Live members list, task toggle, activity feed |
| `/admin` | 🔒 Admin only | Admin panel | Create rooms, manage members |
| `/unauthorized` | Anyone | Access denied | Shown to non-admins hitting `/admin` |
| `/404`, `*` | Anyone | Not found | Catch-all |

App-load behavior: `useAuthInit` calls `/api/auth/me` to validate any stored token before rendering routes — shows a full-page spinner during this check so refreshing never flashes the login page.

---

## Phase-by-Phase Summary

| Phase | What Was Built | Key Files |
|-------|----------------|-----------|
| **1** | Monorepo setup, folder structure, dependencies, env templates | `package.json`, `vite.config.js`, `index.css` |
| **2** | Mongoose models, JWT auth, bcrypt hashing, register/login | `models/User.js`, `utils/jwt.js`, `middleware/auth.js`, `controllers/authController.js` |
| **3** | Room CRUD, member assignment, admin/user route separation | `models/Room.js`, `models/Activity.js`, `controllers/adminController.js`, `controllers/roomController.js` |
| **4** | Task completion/reopen/reset with atomic updates + activity logging | `controllers/taskController.js`, `routes/tasks.js` |
| **5** | Socket.IO server: authenticated handshake, room channels, presence tracking | `socket/socketHandler.js`, `socket/socketAuth.js`, `socket/presence.js` |
| **6** | Full React frontend: Zustand stores, Axios services, all pages and components | `store/*`, `services/*`, `pages/*`, `components/*` |
| **7** | Hardened routing: token validation on load, session-expiry modal, 404/unauthorized pages, error boundary | `hooks/useAuthInit.js`, `components/common/ErrorBoundary.jsx`, `components/common/SessionExpiredModal.jsx`, `pages/NotFoundPage.jsx`, `pages/UnauthorizedPage.jsx` |
| **8** | Optimistic UI, reconnection banner, toast notifications, pulse animations | `store/roomStore.js` (rewrite), `store/toastStore.js`, `components/common/ConnectionBanner.jsx`, `components/common/ToastContainer.jsx`, `hooks/useSocket.js` |
| **9** | Multi-origin CORS, optional single-service static serving, deployment docs | `server/index.js`, `client/vite.config.js`, `Procfile`, `DEPLOYMENT.md` |

---

## Testing Guide

### Auth & routing (Phase 7)

1. **Refresh persistence** — log in, refresh (`F5`). Brief spinner, then same page (not bounced to `/login`).
2. **Session expiry** — set `JWT_EXPIRES_IN=10s`, restart server, log in, wait 15s, click "Mark complete". The **Session expired** modal should appear.
3. **404** — visit `/some-random-path` → gradient 404 page.
4. **Unauthorized** — log in as `alice`, visit `/admin` → "Access denied" page.
5. **Already logged in** — while authenticated, visit `/login` → redirected to `/dashboard`.
6. **Error boundary** — temporarily `throw new Error('test')` in a page component → recovery card, not a blank screen.

### Real-time (Phases 5, 8) — curl smoke test

```bash
# 1. Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

# 2. Create a room
curl -X POST http://localhost:5000/api/admin/rooms \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Sprint Alpha","taskName":"Submit status report"}'

# 3. Add alice (replace ROOM_ID, ALICE_ID — get ALICE_ID from /api/admin/users)
curl -X POST http://localhost:5000/api/admin/rooms/ROOM_ID/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"userId":"ALICE_ID"}'

# 4. Login as alice and complete the task
ALICE_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")

curl -X POST http://localhost:5000/api/tasks/ROOM_ID/complete \
  -H "Authorization: Bearer $ALICE_TOKEN"

# 5. View summary
curl http://localhost:5000/api/tasks/ROOM_ID/all-statuses \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

---

## Multi-User Local Testing (Real-Time)

To see live updates between two different logged-in users on your machine:

### 1. Allow both frontend ports in CORS

In `server/.env`:
```
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

Restart the server fully (kill the process, don't rely on hot-reload — env vars are read once at startup).

### 2. Run a second frontend instance

```bash
cd client
npm run dev -- --port 5174
```

### 3. Set up the test

1. As `admin` (in either tab), create a room and add **two different users** (e.g. `alice` and `bob`) to it
2. Tab A (port 5173): log in as `alice`, open the room
3. Tab B (port 5174): log in as `bob`, open the **same** room

### 4. Trigger real-time sync

- In Tab A, click **Mark complete**
- In Tab B, you should instantly see:
  - Alice's row flip to "✓ Done" with a brief highlight pulse
  - The progress bar update
  - A toast: "Alice completed the task ✓"
  - A new entry at the top of the activity feed

### 5. Test reconnection

- In Tab B, open devtools → Network tab → set to "Offline"
- Wait — a "Connection lost — attempting to reconnect…" banner appears
- Set back to "Online" — banner switches to "Reconnected — your data is up to date" for 3 seconds, and room data silently re-syncs

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full instructions covering:

- **Option A**: Separate frontend (Vercel/Netlify) + backend (Render/Railway) deployments
- **Option B**: Single service — Express serves the built React app (`SERVE_CLIENT=true`)
- Pre-deployment checklist
- Post-deployment smoke test
- Common deployment issues (CORS, Socket.IO origin, MongoDB network access)

---

## Troubleshooting

### Login fails with no clear error / "Network Error"

Check the browser devtools Network tab on the failed `/api/auth/login` request:
- **Status `0` / CORS error** → `CLIENT_URL` on the server doesn't include the frontend's exact origin. Update `server/.env` and **fully restart** the server.
- **Status `401`** → genuinely wrong username/password.

### `Access-Control-Allow-Origin` shows a comma-separated list of origins

This is invalid per the CORS spec and browsers will reject it. Make sure both Express's `cors()` **and** Socket.IO's `cors` config in `server/index.js` use a **dynamic origin function** (`(origin, callback) => ...`), not a raw array — `cors`/Socket.IO will otherwise join array values with commas into a single invalid header. Restart the server after fixing (verify with `lsof -i :5000` that no stale process is still running on the port).

### "Connection lost — attempting to reconnect…" shows on the login page

`ConnectionBanner` should return `null` when the user isn't authenticated (no socket is expected to exist pre-login). If you see this on `/login`, confirm `ConnectionBanner.jsx` checks `useAuthStore((s) => s.isAuthenticated())` and bails out early.

### Socket connects but `join_room` silently fails

`VITE_SOCKET_URL` should be a bare origin with no path (e.g. `http://localhost:5000`, not `http://localhost:5000/api`) — Socket.IO appends `/socket.io` itself.

### MongoDB connection timeout

Atlas **Network Access** doesn't include your current IP (or `0.0.0.0/0` for dynamic-IP PaaS hosts). The connection is still authenticated via username/password — `0.0.0.0/0` is standard for serverless/PaaS deployments.

### Seed script says all users already exist

That's expected on re-run — it's idempotent. To reset, drop the `users` collection in Atlas and re-run `node utils/seed.js`.
