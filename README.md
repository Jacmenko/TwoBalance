# TwoBalance

A small, private, shared expense tracker for exactly two people. Every expense is split 50/50; the
dashboard shows **only your own** balance. Installable PWA (Android Chrome / iOS Safari), React +
TypeScript + Vite + Tailwind on the front end, Supabase (Postgres, anonymous Auth, RLS, Realtime) as
the backend. Full product spec: [`design.md`](./design.md).

## Quick start (local)

```bash
npm install
cp .env.example .env      # then fill in the two values (see below)
npm run dev
```

| Script              | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server                                       |
| `npm run build`     | Type-check + production build (+ service worker) |
| `npm test`          | Unit tests (money, balance, stats, dates, CSV)   |
| `npm run lint`      | ESLint                                           |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm run icons`     | Regenerate placeholder PWA icons                 |

## Supabase setup (once)

1. Create a project at <https://supabase.com>.
2. **Authentication → Sign In / Providers → enable "Allow anonymous sign-ins".**
3. Apply the schema: either paste each file in `supabase/migrations/` (oldest first) into the
   SQL editor and run it, or use the CLI (`supabase link` then `supabase db push`).
4. Confirm **Database → Replication/Publications** includes `expenses` and `members` for
   `supabase_realtime` (the migration adds them; Realtime is optional — the app falls back to
   refetch/polling).
5. Copy values into `.env` from **Project Settings → API**:

| Variable                 | Where it comes from                                    |
| ------------------------ | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Project URL                                            |
| `VITE_SUPABASE_ANON_KEY` | `anon` / publishable key (public; RLS is the boundary) |

**Never** put the `service_role` key, DB password or any signing secret in the front end or in
Vercel `VITE_*` variables.

> Anonymous sign-ins are open to anyone who knows your project URL. Anonymous users can read nothing
> (RLS), but can create an empty space. For a public deployment consider enabling CAPTCHA /
> rate limits under Authentication settings.

### Database security tests

`supabase/tests/security.test.sql` checks RLS, the join flow (wrong/used/expired codes, third
member, direct inserts), cross-couple isolation and function privileges. Run it against a **local
or throwaway** database only:

```bash
supabase start
psql "<local DB url>" -v ON_ERROR_STOP=1 -f supabase/tests/security.test.sql
```

It rolls back when finished. A true two-connection join race is not scripted; the join is
serialised by `SELECT … FOR UPDATE` on the couple row plus a `BEFORE INSERT` trigger on `members`
that takes the same lock.

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel (framework preset: Vite).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project → Settings → Environment
   Variables.
3. Deploy. `vercel.json` rewrites all routes to `index.html` for client-side routing. HTTPS is
   provided by Vercel.
4. Open the URL on both phones. **Android:** Chrome → Install app. **iPhone:** Safari → Share → Add
   to Home Screen.

Free tiers change: before relying on them, check current Vercel and Supabase quotas, personal-use
terms, backups and inactivity rules (free Supabase projects can pause when idle).

## How it works

- **Identity:** Supabase anonymous sign-in; the session persists in browser storage. No passwords.
- **Spaces:** one account can belong to several named spaces (each still has exactly two people),
  e.g. "Home" and "Rome trip". Switch, add, join and rename them from the dashboard (tap the space
  name). The current space is remembered per device; balances and history are per space.
- **Create / join:** `create_couple` and `join_couple` are `SECURITY DEFINER` RPCs. Invite codes are
  12 random characters (≈60 bits, from `gen_random_bytes`), stored only as a SHA-256 hash, single
  use, expire after 7 days. Joining locks the couple row, so a third member can never be added.
  The creator can generate a fresh code from the dashboard until the partner joins.
- **Expenses:** one row each, integer cents, payer must belong to the same couple (composite FK),
  soft-deleted via `deleted_at` (all reads filter it). No hard-delete privilege exists.
- **Balance:** never stored. `paid_totals()` aggregates per payer; the client computes
  `paidByMe − paidByOther` in **half-cents** and converts to cents once, rounding exact halves
  **away from zero**. That rule is symmetric, so one partner's balance is always the exact negative
  of the other's, and odd cents never accumulate error.
- **Realtime:** change events only invalidate queries (data is always refetched). Also refetches on
  reconnect, tab focus and `online`; polls every 20 s while realtime is down.
- **PWA:** the service worker precaches static assets only. API responses are never cached.

## Data export and limitations

- **Export:** History → "Export all expenses (CSV)". Do this occasionally; it is your backup.
- **Anonymous-session limitation:** clearing site data, resetting the device, or switching browser
  loses that device's identity and it cannot be recovered (no email/password). The app detects
  this and says so instead of silently creating a new identity. The partner's device still has the
  data and can export it. Account linking (email/Apple/Google) is a possible future improvement.
- No offline writes: saving requires a connection and the UI never reports success before the
  server confirms.
- Out of scope in V1 (per spec): budgets, settlements, multi-currency, custom categories, >2 members.

## Implementation notes / decisions

- Soft delete chosen (`deleted_at`) so Realtime update events reach the other device.
- Payer is fixed to the current user when adding, and is not editable when editing.
- Amount input accepts `.` or `,` as the single decimal separator (max 2 decimals, max 1,000,000).
- Statistics and CSV page through results past the API's 1,000-row cap; the history list shows the
  latest 300 and says so.
- DB types are hand-written in the service modules instead of generated; run
  `supabase gen types typescript` if you want generated ones.

## Project layout

```
src/app            App shell, routes, layout
src/features       auth, shared-space, dashboard, expenses, history, statistics, realtime
src/components     ui primitives, balance card, expense row/form
src/lib            money (parse/format/balance), dates, statistics, csv, supabase client
src/services       all Supabase access (auth, couple, expense, error mapping)
supabase/          migrations + security tests
tests/unit         Vitest tests
```
