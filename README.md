# Velozity Global Solutions — Real-Time Client Project Dashboard

Full-stack TypeScript implementation of the supplied technical assessment.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma
- Real-time: Socket.IO
- Auth: short-lived JWT access token + rotating refresh token in an HttpOnly cookie
- Validation: Zod
- Background jobs: node-cron

## Architecture
The backend is layered as routes -> middleware -> services -> Prisma. Socket.IO authenticates the same access JWT and applies the same database authorization rules before joining project rooms. Task status changes are persisted as Activity records before a Socket.IO event is emitted, so reconnecting clients can fetch missed events from PostgreSQL.

## Why Socket.IO
The assessment explicitly requires WebSockets and permits Socket.IO. Socket.IO gives authenticated rooms, reconnect handling, presence, acknowledgements and a clean browser client while still using WebSocket transport.

## Why node-cron
The overdue requirement is a periodic deterministic database operation rather than a distributed queue workload. node-cron is sufficient for this single-service assessment. In a horizontally scaled production deployment, move this job to BullMQ/Redis or a dedicated worker so it executes once across replicas.

## Refresh-token approach
Access tokens are short-lived and kept in frontend memory. Refresh tokens are opaque random tokens, stored hashed in PostgreSQL and sent to the browser only as an HttpOnly, SameSite cookie. Logout revokes the database session. No refresh token is stored in localStorage.

## Important deployment note
The React frontend can be deployed to Vercel. The Socket.IO/Express API needs a persistent Node runtime; deploy the backend to a service that supports long-lived WebSocket connections (for example Render, Railway, Fly.io, or a VM) and configure `VITE_API_URL`/`VITE_SOCKET_URL`. If the evaluator requires a single Vercel URL, use a Vercel frontend that talks to the separately hosted API.

## Local setup
1. Copy `backend/.env.example` to `backend/.env`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. `npm install`.
4. `npm run prisma:generate -w backend`.
5. `npm run prisma:migrate -w backend`.
6. `npm run prisma:seed -w backend`.
7. `npm run dev`.

Frontend: http://localhost:5173
API: http://localhost:4000
Health: http://localhost:4000/health

## Demo accounts
All seed users use password `Password123!`.
- admin@velozity.dev
- pm1@velozity.dev
- pm2@velozity.dev
- dev1@velozity.dev
- dev2@velozity.dev
- dev3@velozity.dev
- dev4@velozity.dev

## Database/indexing decisions
Indexes exist on user role, project creator/client, task project/developer/status/priority/due date, activities project/createdAt and actor/createdAt, notifications user/read/createdAt, and refresh-session user/token/expiry. These match dashboard, authorization, feed, notification and overdue queries.

## Security decisions
- Authorization is enforced in the API and Socket.IO layer.
- Developers receive only tasks assigned to themselves.
- PMs can only access projects they created.
- Project room membership is checked server-side.
- Refresh tokens are hashed before database storage.
- Passwords use bcrypt.
- Zod validates request bodies/query strings.
- Structured JSON errors are returned; stack traces are logged server-side only.

## Assessment mapping
- 3 roles + JWT access/refresh: implemented
- HttpOnly refresh cookie: implemented
- Project/task management: implemented
- Persisted task status activity: implemented
- Scheduled overdue job: implemented
- Socket.IO project/global feeds: implemented
- Missed last-20 activity catch-up: implemented
- Presence count: implemented
- Role-specific dashboards: implemented
- Query-param filters: implemented
- Assignment and In Review notifications: implemented
- Real-time unread notification badge: implemented
- Seed data: implemented

## Known limitations
- Presence is process-local; use a Redis adapter for multi-instance production deployments.
- The scheduled cron job runs in the API process; use a dedicated worker in a multi-replica deployment.
- File uploads and client CRUD UI are outside the core assessment scope; the API contains client creation/listing for the required Admin capability.


## Explanation field (submission-ready, 190 words)
The hardest part was combining strict role-based authorization with a real-time activity feed. I did not treat the frontend as a security boundary. Every protected REST endpoint checks the authenticated user role, and project/task access is additionally checked against ownership or task assignment in the database. Socket.IO connections are authenticated with the access token, project-room joins are authorized server-side, and activity/notification events are emitted only to users who are allowed to receive them.

For real-time updates, a task status change is written to PostgreSQL as an Activity record before the event is emitted. This makes the database the source of truth instead of an in-memory event buffer. When a user reconnects or opens a project, the server fetches the most recent 20 persisted activity events, so missed events are available even after the process has restarted. Presence is maintained through active Socket.IO connections and broadcast as a live count.

If I were doing this for a larger production deployment, I would move presence and Socket.IO fan-out to Redis and run the overdue scheduler as a separate BullMQ worker. That would make the system safer to scale horizontally while keeping the API stateless.
