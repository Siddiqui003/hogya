# TaskFlow — Real-time Task Coordination

A full-stack web application where users in shared rooms can coordinate tasks and see each other's completion status in real time.

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
| Real-time   | Socket.IO                         |

---

## Project Structure

```
taskflow/
├── package.json              ← Root (monorepo scripts)
├── .gitignore
│
├── server/
│   ├── index.js              ← Express + Socket.IO entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js             ← MongoDB connection
│   ├── controllers/          ← Route handlers
│   ├── middleware/           ← Auth, error middleware
│   ├── models/               ← Mongoose schemas
│   ├── routes/               ← Express routers
│   ├── socket/               ← Socket.IO event handlers
│   └── utils/                ← Helpers (token, response)
│
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── components/
        │   ├── common/       ← Button, Input, Badge, Spinner…
        │   └── layout/       ← Navbar, Sidebar, PageWrapper
        ├── pages/            ← Login, Register, Dashboard, Room, Admin
        ├── store/            ← Zustand stores (auth, rooms, socket)
        ├── hooks/            ← Custom React hooks
        ├── services/         ← Axios API service functions
        └── utils/            ← Date formatting, constants
```

---

## Phases

| Phase | What's Built |
|-------|-------------|
| 1     | Project setup, folder structure, dependencies |
| 2     | MongoDB models, JWT authentication |
| 3     | Room management APIs |
| 4     | Task completion APIs |
| 5     | Socket.IO real-time integration |
| 6     | React frontend components |
| 7     | Protected routing |
| 8     | Real-time dashboard |
| 9     | Deployment preparation |

---

## Phase 1 Setup Instructions

### Prerequisites

- Node.js v18+ (`node --version`)
- npm v9+ (`npm --version`)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works)
- Git

### 1. Clone / create the project

```bash
# If starting from this generated output:
mkdir taskflow && cd taskflow
# copy all files into place per the guide
```

### 2. Install root dependencies

```bash
# From the taskflow/ root
npm install
```

### 3. Install server dependencies

```bash
cd server
npm install
cd ..
```

### 4. Install client dependencies

```bash
cd client
npm install
cd ..
```

### 5. Configure environment variables

**Server:**
```bash
cd server
cp .env.example .env
# Edit .env and fill in:
#   MONGODB_URI — your Atlas connection string
#   JWT_SECRET  — any long random string (32+ chars)
```

**Client:**
```bash
cd client
cp .env.example .env.local
# Defaults work for local development
```

### 6. Verify the server starts

```bash
# From taskflow/ root — starts both server and client
npm run dev

# Or start separately:
cd server && npm run dev    # → http://localhost:5000
cd client && npm run dev    # → http://localhost:5173
```

### 7. Test the health endpoint

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 8. Open the app

Visit **http://localhost:5173** — you should see the TaskFlow placeholder page.

---

## MongoDB Atlas Setup

1. Create a free account at https://cloud.mongodb.com
2. Create a new **Shared** cluster (M0 free tier)
3. Under **Database Access** → Add a user with password auth
4. Under **Network Access** → Add IP `0.0.0.0/0` (for dev; tighten for prod)
5. Click **Connect** → **Connect your application** → copy the URI
6. Replace `<username>`, `<password>`, `<cluster>` in your `.env`

---

## Available Scripts

From the **root** `taskflow/` directory:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both server and client in parallel |
| `npm run server` | Start only the Express server (with nodemon) |
| `npm run client` | Start only the Vite dev server |
| `npm run build` | Build the React app for production |
| `npm run install:all` | Install all dependencies (root + server + client) |

---

## Design Decisions

### Completion status storage

**Chosen: Embedded in Room document**

Each room's `members` array contains `{ user, completedAt, isCompleted }`.

**Why for MVP:**
- Single document read to get room + all member statuses
- Atomic updates with `$set` on nested array element
- No JOIN-equivalent queries needed
- Simpler Socket.IO broadcast (one event, one document)

**Tradeoffs (why a separate collection wins at scale):**
- With 1000s of members per room, the embedded array grows large
- Querying "all tasks completed by user X across all rooms" requires scanning every room
- A `TaskCompletion` collection enables efficient user-centric analytics

For this MVP (rooms with <100 members), embedded is the right call.

---

## Phase 7: Protected Routing & Edge Cases — Testing

### Manual test checklist

1. **Refresh persistence** — log in, then refresh the page (`F5`). You should briefly see a spinner, then land back on the same page (not bounced to `/login`).

2. **Session expiry** — set `JWT_EXPIRES_IN=10s` in `server/.env` temporarily, restart the server, log in, wait 15 seconds, then click anything that hits the API (e.g. "Mark complete"). You should see the **Session expired** modal, not a silent redirect.

3. **404 page** — visit `http://localhost:5173/some-random-path`. You should see the gradient 404 page with a button back to dashboard/login.

4. **Unauthorized page** — log in as a non-admin (e.g. `alice`), then manually visit `http://localhost:5173/admin`. You should see the "Access denied" page, not the admin panel and not a silent bounce.

5. **Already logged in** — while logged in, visit `/login` or `/register` directly. You should be redirected to `/dashboard` immediately.

6. **Error boundary** — (dev only) temporarily throw an error in any page component (`throw new Error('test')`) and confirm the recovery card appears instead of a blank screen.

---

## Available Pages

| Path | Access | Page |
|------|--------|------|
| `/login` | Public (redirects if authed) | Login |
| `/register` | Public (redirects if authed) | Register |
| `/dashboard` | Authenticated | Your rooms |
| `/rooms/:id` | Authenticated + member | Room detail |
| `/admin` | Admin only | Admin panel |
| `/unauthorized` | Anyone | Access denied |
---

## Environment Variables Reference

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs (32+ chars) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: `http://localhost:5173`) |

### Client (`client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | API base URL (default: `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | No | Socket.IO URL (default: `http://localhost:5000`) |

---

## Expected Output After Phase 1

- ✅ Server starts on port 5000
- ✅ `GET /api/health` returns `{"status":"ok"}`
- ✅ Client starts on port 5173
- ✅ Browser shows TaskFlow placeholder page
- ✅ No import errors in server console
