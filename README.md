# SplitEase

Personal expense splitting: React + TypeScript + Tailwind, Express on Vercel, MongoDB Atlas.

## Run locally
1. `npm install`
2. `cp .env.example .env` and set `MONGODB_URI` (Atlas: allow your IP under Network Access).
3. `npm run dev` (web on :5173, API on :4000). The dashboard shows "API ok, database connected".

## Deploy to Vercel
1. Push to GitHub, then Import Project in Vercel (framework: Vite).
2. Add env vars `MONGODB_URI` and `APP_PASSCODE`.
3. In Atlas Network Access, allow `0.0.0.0/0` (Vercel IPs are dynamic).
4. Deploy. `/api/*` is served by `api/index.ts`, everything else by the SPA.

## Rules
- Money is integer paise. Balances are computed from the ledger, never stored.
- Balance = Share − Advances − Paid by them − Settlements paid + Settlements received. `+` pays, `−` receives.
- All financial logic lives in `server/services` (added in Phase 4; tests in `tests/`).

## Features
Groups, members and advances; expenses (equal split, edit/delete); balances and min-transaction settlement suggestions; partial settlements; history with filters; dashboard and reports (Recharts); light/dark theme.

## Sample data and tests
- `npm run seed` creates "Goa Trip (sample)" with advances, expenses and a settlement.
- `npm test` runs the balance, split and settlement unit tests.

## Extending splits
Expenses store `shares: [{memberId, sharePaise}]`. The API already accepts `splitType: "custom"` with explicit shares; percentage splits only need a converter to shares in `server/services/split.ts`.
