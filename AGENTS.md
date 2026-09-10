# Base44 Dev Environment

## What this app is
Vite + React 18 frontend-only dashboard for Tyson Foods Mx. Reads data live from a Google Sheet (CSV export) using `VITE_SHEET_ID`. No backend, no database.

## How to run
```bash
docker compose -f docker-compose.base44.yml up -d
```
- Node 22 slim image, source bind-mounted at `/app`
- Vite dev server on port 5173, mapped to host port 3000
- `npm install` runs at container start, then `npx vite --host 0.0.0.0 --port 5173`
- Live reload is active (Vite HMR)

## Required credential
- `VITE_SHEET_ID` — Google Sheet ID from the Sheet URL (between `/d/` and `/edit`). The Sheet must be "Published to the web" as CSV. Without it, the app boots but shows "Error al cargar los datos".

## Vite config note
`vite.config.js` was changed from `open: true` to `host: true` so the dev server binds to 0.0.0.0 (required for Docker).

## Verification
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
- Served HTML includes `/@vite/client` and `/src/main.jsx` (dev mode, not prebuilt)
