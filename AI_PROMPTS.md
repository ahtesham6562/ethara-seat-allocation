# AI_PROMPTS.md

Documentation of AI tool usage for the **Ethara Seat Allocation & Project Mapping System**.

- **AI tools used:** Claude (Anthropic) as the primary coding assistant.
- **How code was validated:** every generated module was run locally against a real MongoDB instance — the seed script, all REST endpoints (via `curl`), the allocation/business-rule edge cases, and the production frontend build. Outputs were checked against the assessment's required quotas and business rules. Specific bugs found and fixed are listed in [What AI got wrong / what I fixed](#what-ai-got-wrong--what-i-fixed).

---

## Prompt flow

### Prompt 1 — Architecture
> "I'm building a seat-allocation system for ~5,000 employees (employees, projects, seats, allocations, dashboard, a natural-language query endpoint, JWT auth). I want a MERN stack — MongoDB, Express, React (Vite), Node. Propose a monorepo layout (`backend/` + `frontend/`), the module boundaries (models / routes / services / middleware), and how the allocation logic should be isolated so it can be reused by the seed script, the REST route, and the AI assistant."

### Prompt 2 — Database
> "Design Mongoose schemas for employees, projects, seats, seat_allocations, and users. Enforce these at the DB level: unique employee email, unique seat number per (floor, zone), one *active* allocation per employee, and one *active* allocation per seat. Use partial unique indexes for the 'active only' constraints so released allocations don't collide. Map timestamps to created_at/updated_at."

### Prompt 3 — Backend APIs
> "Generate Express routers for all required endpoints: employee CRUD with search/filter/pagination; projects incl. `GET /projects/:id/employees`; seats incl. `/seats/available`; dashboard summary/project-utilization/floor-utilization using aggregation; and `POST /ai/query`. Add an async error wrapper and a central error handler that turns Mongo duplicate-key (11000) errors into clean 409 responses. Serve OpenAPI docs at `/docs` via swagger-ui-express."

### Prompt 4 — Seat allocation logic
> "Write an allocation service that is safe on standalone MongoDB (no multi-doc transactions). Allocating must: reject if the employee already has an active seat; atomically claim a seat only if it's still `available` (guarded `findOneAndUpdate`); create the allocation record; roll back the seat claim if the allocation insert fails. Add a `suggestSeats(projectId)` that finds the zone/bay where the project already sits most and returns available seats there first, falling back to alternate zones. Releasing must free the seat and flip the employee back to pending."

### Prompt 5 — AI assistant
> "Build a rule-based natural-language parser (no external LLM required) that handles: locate an employee by email or name, which project an employee is on, available seats (optionally on a given floor), and seat utilization for a named project. Extract email/name/floor/project via regex, run the real MongoDB query, and return a grounded answer plus structured data. Then add an *optional* Groq LLM layer that only rephrases the answer from the data already fetched — it must never invent seat numbers — and falls back to the rule-based answer if there's no API key or the call fails."

### Prompt 6 — Frontend
> "Build a React + Vite + Tailwind SPA: login (with demo-account quick-fill), a dashboard using Recharts (stat tiles, seat-status pie, floor-occupancy stacked bars, project-wise bars), an employees page with search/filter/pagination + allocate/release + an 'add new joiner' modal with auto-allocate, a seats page with filters, and an AI assistant chat. Central `api.js` client that attaches the JWT; an auth context in localStorage; role-gate write actions to admin/HR. Use a Vite dev proxy so `/api` hits the backend without CORS locally."

### Prompt 7 — Testing
> "Give me `curl` commands to verify the whole backend against a seeded DB: health, dashboard summary vs the required quotas, all four AI query types, login → token, allocate a pending employee, attempt a duplicate allocation (expect 409), release, and an unauthenticated allocate (expect 401)."

### Prompt 8 — Debugging
> "After seeding, `GET /dashboard/floor-utilization` shows floors 1–4 at 100% occupancy and every free seat dumped on floor 5, so 'available seats on Floor 3' returns 0. I allocated the first 4,800 seats contiguously. Rework the seed so each floor keeps a share of available/reserved/maintenance seats while still keeping project seat-clusters intact."

### Prompt 9 — Deployment
> "Produce deployment config: a `render.yaml` blueprint for the Express backend (rootDir backend, health check, env vars for MONGODB_URI/JWT_SECRET/CLIENT_ORIGIN/GROQ_API_KEY), a `vercel.json` for the Vite frontend with an SPA rewrite and a `VITE_API_URL` env var, plus a Dockerfile and a docker-compose (mongo + api) for the Docker deployment option. Write the README deployment steps for Atlas + Render + Vercel."

### Prompt 10 — Refactoring
> "Review the codebase for reuse and safety: make sure the allocation logic lives in one service used by the seed script, the `/seats/allocate` route, and the AI flow; centralize error handling; keep the API client DRY (one `request()` helper); and confirm the AI assistant degrades gracefully to rule-based mode when no LLM key is present."

---

## What AI generated correctly

- Mongoose schemas and the **partial unique indexes** — one active allocation per employee and per seat worked exactly as intended (verified by the duplicate-allocation test returning 409).
- The full set of REST endpoints and the **Swagger `/docs`** page.
- The **atomic allocation service** with rollback — no double-booking under the guarded-update approach, and it runs on standalone MongoDB with no transaction setup.
- Dashboard **aggregation pipelines** (seat-status counts, floor occupancy with computed %, project-wise allocation).
- The **rule-based AI parser** — all four sample query types returned correct grounded answers.
- The React frontend — it built cleanly (840 modules) and the Vite proxy reached the backend on the first try.

## What AI got wrong / what I fixed

| Issue | Fix |
|-------|-----|
| **Free seats clustered on one floor.** First seed allocated seats contiguously, filling floors 1–4 and leaving all availability on floor 5, so `Floor 3` availability queries returned 0. | Reworked the seed to reserve a per-floor share of free seats (140/floor) *before* allocating, and to spread reserved/maintenance across floors via an interleave helper. Re-verified: every floor now ~87% occupied with 110 available each. |
| **Reserved/maintenance drawn from a contiguous tail** (same root cause) — they'd all land on the last floor. | Selected them from the interleaved free-seat pool so they appear across all floors. |
| LLM answers risked **inventing seat data** if the model were given the raw question alone. | Constrained the Groq layer to rephrase *only* from the JSON context we fetched from Mongo, with a system prompt forbidding invented values, and a hard fallback to the rule-based answer on any error. |

## How I verified correctness

1. **Seed quotas** — ran `npm run seed` and confirmed the printed table matched the assessment exactly: 5,000 employees · 5,500 seats · 550 available · 100 reserved · 50 maintenance · 200 pending · 11 projects.
2. **Endpoints** — `curl` against the live server: `/health`, `/dashboard/summary` (numbers matched the seed), and all three dashboard aggregations.
3. **AI** — tested all four query shapes; e.g. `"Where is my seat? My email is amit@ethara.ai"` → `"You are allocated Floor 1, Zone A, Bay 1, Seat A1-1. Project: Indigo."`
4. **Business rules** — allocated a pending new joiner (success), repeated the allocation (**409** "already has an active seat"), released (success), and tried an unauthenticated allocate (**401** "Missing token").
5. **Frontend** — `npm run build` succeeded; the dev server served the app and its `/api` proxy returned live backend data end-to-end.
