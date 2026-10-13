# HRSuite — Attendance & Payroll Frontend

React + Vite + TypeScript frontend for the HRSuite employee attendance & payroll platform.

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS
- React Router v6
- Axios (centralized API layer, ready for PostgreSQL/Supabase backend)
- Chart.js (dashboard charts), Lucide React (icons)
- Docker support

## Getting started (local)
```bash
npm run setup   # installs deps, creates .env, reports demo vs database mode
npm run dev
```
Open http://localhost:5173 (or your `VITE_PORT`). All behavior is env-driven via `src/lib/config.ts`
(`VITE_APP_NAME`, `VITE_TARGET_HOURS`, `VITE_SHIFT_HOURS`, `VITE_GRACE_MINUTES`); empty Supabase keys
mean local demo data, filled keys mean shared Postgres.

## Docker
```bash
docker compose up
```

## Demo accounts
| Role | Email | Password |
| --- | --- | --- |
| Super Admin | admin@sunrisedigital.ph | admin123 |
| HR/Admin | hr@sunrisedigital.ph | hr123 |
| Manager | manager@sunrisedigital.ph | manager123 |
| Employee | employee@sunrisedigital.ph | emp123 |

## Structure
```
src/
├── api/            # Axios instance + endpoint modules
├── assets/
├── components/
│   ├── layout/     # Sidebar, Header
│   ├── payroll/    # Payslip
│   └── ui/         # Modal, badges, toast, CSV export
├── context/        # Auth context
├── data/           # Mock data layer (localStorage-backed)
├── layouts/        # DashboardLayout (sidebar + header + page transition)
├── pages/          # Route pages
├── services/       # API service layer (mock-ready)
└── App.tsx         # Routes
```

## Migrating to the backend
Set `VITE_API_URL` in `.env`. All API calls go through `src/api/axios.ts` with auth-token and error interceptors. Pages currently read from `src/data/mock.js`; swap each page's data source to its corresponding service in `src/services/` when the backend is ready.

## Database (Supabase Postgres, offline-first)
The app runs without any backend (localStorage demo data). To use a real shared database:
```bash
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```
1. Supabase → New project → SQL Editor → run `supabase/schema.sql` (creates tables + demo RLS policies).
2. `npm run dev` and log in once with a demo account — the app pulls Postgres on start, and seeds it from the local demo data if tables are empty (`src/lib/sync.ts:seedDatabase`).
3. Writes for clock-in/out (`TodayAttendance`), employees (`Employees`), and leave requests (`Leave`) write through to Supabase and fall back to localStorage offline.

Without `VITE_SUPABASE_URL` set, everything keeps working locally exactly as before.
