# CanteenFlow AI

AI-powered campus canteen management app — order food, reserve seats, track live crowd, and chat with Flowie, your AI canteen assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/canteenflow run dev` — run the frontend (port from `PORT` env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Wouter + Clerk Auth (`@clerk/react@6.6.2`)
- State: Zustand 5 (persist for gamification store)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/canteenflow/` — React frontend
  - `src/pages/` — page components (menu.tsx, orders.tsx, seats.tsx, profile.tsx, landing.tsx)
  - `src/components/` — UI components
    - `UpiPaymentModal.tsx` — COD + UPI online payment modal (3-step: method select → processing → success)
    - `FlowieChat.tsx` — Flowie AI chatbot (floating purple button, intent-based, menu + chat modes)
    - `GamificationOverlay.tsx` — LevelBadge, PointsAnimation, level tier display
  - `src/hooks/`
    - `useGuestMode.ts` — localStorage-backed guest/skip-login mode with role (student/staff)
    - `useGamification.ts` — Zustand persist store (points, level, coupons)
    - `useCart.ts` — Zustand cart store
    - `useCurrentUser.ts` — unified user hook (Clerk + guest support)
  - `.env.example` — frontend env template
- `artifacts/api-server/` — Express 5 API
  - `src/routes/` — route handlers (menu, orders, seats, ai, payments)
  - `.env.example` — backend env template
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/` — generated Zod schemas
- `lib/api-client-react/` — generated React Query hooks
- `lib/db/` — Drizzle ORM schema + migrations

## Architecture decisions

- **Contract-first API**: OpenAPI spec in `lib/api-spec` drives Zod validation and React Query hooks via Orval codegen. Run `pnpm --filter @workspace/api-spec run codegen` after spec changes.
- **Guest mode via localStorage**: Keys `canteenflow_guest: "true"` and `canteenflow_guest_role: "student"|"staff"`. `useCurrentUser` returns a mock AppUser (id: -1, isGuest: true) for guests so all components work uniformly.
- **Gamification**: Zustand persist key `canteenflow-gamification`. Points per order = `floor(total/10)`. Levels: Bronze 0, Silver 100, Gold 500, Platinum 1000. Coupons auto-unlock at tier: SILVER10, GOLD20, PLAT30.
- **Payment flow**: Cart drawer shows "Cash on Delivery" + "Pay Online" buttons. UpiPaymentModal handles both; COD skips the scan/verify steps and confirms immediately. `onSuccess(method)` callback carries the chosen method string to the order POST.
- **Windows-safe dev script**: API server uses `cross-env NODE_ENV=development` instead of POSIX `export`, so `pnpm dev` works on Windows local machines without modification.

## Product

- **Landing page**: Hero with guest/student/staff login options; "Continue without login →" skips auth.
- **Menu page**: Search, category filter, AI recommendations (signed-in only), crowd indicator, cart drawer with COD + UPI payment, gamification level badge.
- **Orders page**: Live order tracking with status timeline.
- **Seats page**: Interactive seat reservation map.
- **Profile page**: User stats, order history, gamification progress.
- **Flowie chatbot**: Floating AI assistant (intent matching for hours, crowd, menu, orders, help).
- **Gamification**: Points per order, level tiers with visual badges, coupon unlocks.

## User preferences

- Windows-local compatibility is important — avoid POSIX-only shell syntax in npm scripts.
- `.env.example` files must be kept up to date for both frontend and backend.
- Guest mode should feel first-class, not like a fallback.

## Gotchas

- `PORT` and `BASE_PATH` env vars are required by `vite.config.ts` at startup — the workflow provides them; local Windows devs must set these in `.env` or their shell.
- The API server dev script rebuilds on every `pnpm dev` invocation (esbuild is fast, ~250ms).
- `@react-three/fiber` must stay at `^9.6.1` and `@react-three/drei` at `^10.7.7` for React 19 compatibility — do not upgrade to older major versions.
- Never use `console.log` in server code — use `req.log` in routes and the `logger` singleton elsewhere.
- `VerifyPaymentBody.orderId` is `number | null | undefined` (`.nullish()` in Zod) — always null-check before passing to `eq()`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
