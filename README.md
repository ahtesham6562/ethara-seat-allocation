# Ethara Seat Allocation & Project Mapping System

Full-stack app to manage seat allocation for ~5,000 employees across projects, floors, and zones — with search, a live dashboard, and a natural-language AI assistant.

**Stack:** MongoDB · Express · React (Vite) · Node — MERN. Rule-based AI assistant with optional Groq LLM. JWT auth.

---

## Live Links

| Item | URL |
|------|-----|
| **Frontend** | https://ethara-seat-allocation-three.vercel.app |
| **Backend API** | https://ethara-api-u7r4.onrender.com |
| **API docs (Swagger)** | https://ethara-api-u7r4.onrender.com/docs |
| **GitHub repo** | https://github.com/ahtesham6562/ethara-seat-allocation |

> **Note:** the backend runs on Render's free tier, which sleeps after ~15 minutes of inactivity. The first request after idling takes ~30–50s to cold-start; subsequent requests are fast.

### Sample login credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ethara.ai` | `admin123` |
| HR | `hr@ethara.ai` | `hr12345` |
| Employee | `employee@ethara.ai` | `emp12345` |

Demo AI query employee: `amit@ethara.ai`

---

## Features

- **Employee management** — code, name, email, department, role, joining date, status, project, seat status. Full CRUD.
- **Project mapping** — 11 projects; each employee mapped to one project.
- **Seat allocation** — floor/zone/bay/seat, status (available/occupied/reserved/maintenance). Atomic, duplicate-safe.
- **New joiner flow** — add employee → auto-suggest & allocate a seat near their project team; alternate zones if the preferred area is full.
- **Search & filter** — by name, ID, email, project, floor, zone, seat status.
- **Dashboard** — totals, seat-status breakdown, floor occupancy, project-wise allocation, pending allocations.
- **AI assistant** — natural-language queries ("Where is my seat?", "Available seats on Floor 3", "Seats occupied for Project Indigo"). Rule-based (grounded in DB) with optional Groq LLM phrasing.
- **Auth** — JWT; write actions (create/allocate/release) restricted to admin/HR.

---

## Project structure

```
ethara/
├── backend/            # Express + Mongoose REST API
│   ├── src/
│   │   ├── models/         # Employee, Project, Seat, SeatAllocation, User
│   │   ├── routes/         # auth, employees, projects, seats, dashboard, ai
│   │   ├── services/       # allocationService, aiParser, aiLLM (Groq)
│   │   ├── middleware/      # auth (JWT), roles, error handler
│   │   ├── swagger.js       # OpenAPI spec -> /docs
│   │   ├── seed.js          # generates 5k employees, 5.5k seats, etc.
│   │   ├── app.js / server.js
│   └── Dockerfile
├── frontend/           # React + Vite + Tailwind + Recharts
│   └── src/pages/       # Login, Dashboard, Employees, Seats, Assistant
├── render.yaml         # backend blueprint (Render)
├── docker-compose.yml  # local mongo + api
├── AI_PROMPTS.md       # AI usage documentation (required)
└── README.md
```

---

## Run locally

### Prerequisites
- Node 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas URI

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit MONGODB_URI / JWT_SECRET if needed
npm install
npm run seed                # populate demo data (idempotent — clears + reseeds)
npm run dev                 # http://localhost:5000  (docs at /docs)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api/*` → `http://localhost:5000`, so no CORS setup is needed locally.

### Or with Docker

```bash
docker compose up --build
docker compose exec api npm run seed
# frontend: cd frontend && npm run dev
```

---

## Seed data (meets assessment quotas)

| Metric | Value |
|--------|-------|
| Employees | 5,000 |
| Floors | 5 |
| Zones | 10 (A–J) |
| Seats | 5,500 |
| Projects | 11 |
| Available seats | 550 |
| Reserved seats | 100 |
| Maintenance seats | 50 |
| Pending allocation | 200 |

Seats are allocated in **project clusters** across all floors, so "near the team" suggestions and floor-level queries are realistic.

---

## API endpoints

Full interactive docs at `/docs` (Swagger UI). Summary:

**Auth** — `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
**Employees** — `GET /employees` (search/filter/paginate), `POST /employees`, `GET /employees/:id`, `PUT /employees/:id`, `DELETE /employees/:id`
**Projects** — `GET /projects`, `POST /projects`, `GET /projects/:id/employees`
**Seats** — `GET /seats`, `GET /seats/available`, `GET /seats/suggest`, `POST /seats`, `POST /seats/allocate`, `POST /seats/release`
**Dashboard** — `GET /dashboard/summary`, `GET /dashboard/project-utilization`, `GET /dashboard/floor-utilization`
**AI** — `POST /ai/query`

Example:

```bash
curl -X POST http://localhost:5000/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Where is my seat? My email is amit@ethara.ai"}'
# {"answer":"You are allocated Floor 1, Zone A, Bay 1, Seat A1-1. Project: Indigo.", ...}
```

Write endpoints require `Authorization: Bearer <token>` from `/auth/login`.

---

## Database model

- **employees** — employee_code, name, email (unique), department, role, joining_date, status, project (ref), seat_allocation_status
- **projects** — name (unique), description, manager_name, status
- **seats** — floor, zone, bay, seat_number, status, allocated_employee (ref), allocated_project (ref); unique index on (floor, zone, seat_number)
- **seat_allocations** — employee (ref), seat (ref), project (ref), allocation_status, allocation_date, released_date; partial unique indexes ensure one active allocation per employee and per seat
- **users** — name, email, password_hash, role (admin/hr/employee)

---

## Core business rules (enforced)

- One employee → one active seat (partial unique index).
- One seat → one active employee (guarded atomic status update + partial unique index).
- Released seats return to `available`.
- Reserved/maintenance seats cannot be allocated.
- New joiners are placed near their project team; alternate zones if full.
- Duplicate employee email rejected (unique index).
- Duplicate seat number on same floor/zone rejected (compound unique index).
- Dashboard reflects state after every allocate/release.

Allocation uses atomic conditional updates (`findOneAndUpdate` guarded on `status: "available"`) with rollback — safe on standalone MongoDB, no multi-document transaction required.

---

## AI assistant

Two-layer, **grounded** design:
1. **Rule-based parser** (`aiParser.js`) extracts entities (email, name, floor, project), classifies intent, and queries MongoDB for the real answer.
2. **Groq LLM** (`aiLLM.js`, optional) rephrases the answer using *only* the fetched data — it never invents seat numbers.

Without `GROQ_API_KEY`, the assistant runs fully rule-based (the assessment's fallback requirement). See [AI_PROMPTS.md](AI_PROMPTS.md).

---

## Deployment

### Backend → Render
1. Push repo to GitHub.
2. Create a free **MongoDB Atlas** cluster; copy its connection string.
3. Render → New → Blueprint → select this repo (uses `render.yaml`).
4. Set env vars: `MONGODB_URI` (Atlas), `CLIENT_ORIGIN` (your Vercel URL), optional `GROQ_API_KEY`.
5. After first deploy, seed once from the Render Shell: `npm run seed`.

### Frontend → Vercel
1. Vercel → New Project → import repo → **Root Directory = `frontend`**.
2. Env var `VITE_API_URL` = your Render backend URL (e.g. `https://ethara-api.onrender.com`).
3. Deploy. `vercel.json` handles the SPA rewrite.

Update the [Live Links](#live-links) table once both are up.
