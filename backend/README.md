# Automatic Railway Block Planning Backend

This is the remaining backend layer for the schema already created in `src/db/schema.ts`.

## Routes

GET `/`
GET `/api/health`

### Corridors
GET `/api/corridors`
GET `/api/corridors/:id`
POST `/api/corridors`
PATCH `/api/corridors/:id`
DELETE `/api/corridors/:id`

### Assets
GET `/api/assets`
GET `/api/assets/:id`
POST `/api/assets`
PATCH `/api/assets/:id`

### Maintenance
GET `/api/maintenance/tasks`
GET `/api/maintenance/tasks/all`
GET `/api/maintenance/tasks/:id`
POST `/api/maintenance/tasks`
PATCH `/api/maintenance/tasks/:id`
POST `/api/maintenance/tasks/:id/recalculate-priority`
POST `/api/maintenance/tasks/:id/complete`

### Trains / COA
GET `/api/trains`
POST `/api/trains`
GET `/api/trains/forecasts`
POST `/api/trains/forecasts`
GET `/api/trains/block-windows`
POST `/api/trains/block-windows`

### Blocks
GET `/api/blocks`
GET `/api/blocks/:id`
PATCH `/api/blocks/:id/status`

### Planning
POST `/api/planning/generate`
GET `/api/planning/runs`
GET `/api/planning/dashboard`

### Integration simulator
POST `/api/integration/tms/maintenance`
POST `/api/integration/smms/maintenance`
POST `/api/integration/tdms/maintenance`
POST `/api/integration/coa/train`
POST `/api/integration/coa/forecast`
POST `/api/integration/coa/block-window`

## Important

Copy these files into your existing backend. Keep your existing `src/db/schema.ts`, `src/db/index.ts`, `.env`, and `drizzle.config.ts`.

Then run migrations and start:

npm run db:generate
npm run db:migrate
npm run dev

The optimizer is intentionally prototype-sized for a hackathon. It prioritizes pending tasks, finds available corridor windows, rejects train conflicts, groups nearby compatible tasks, creates blocks, updates task status, and records optimization metrics.
