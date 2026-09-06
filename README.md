# Leia Admin

Next.js 14 App Router foundation for the Leia tenant admin panel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase project URL, public anon key, and Leia backend URL.
3. Run `npm install`.
4. Run `npm run dev`.

The frontend must never receive a Supabase service-role key.

## Database handoff

`022_tenant_users.sql` is a standalone migration for the owner to review and apply to the Leia Supabase project. It is not applied by this repository.

## Checks

Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Onboarding steps 2–4

- `/onboarding/step-2` loads and updates the existing assistant profile. Name is required; supported reply languages are selected as an array (`he`, `ru`, `en`). Tone and style are free text.
- `/onboarding/step-3` connects WhatsApp through authenticated Next.js proxies and allows skipping to step 4.
- `/onboarding/step-4` lists tenant knowledge items and supports adding, editing, and deleting question/answer pairs. Finish navigates to `/admin`, including with zero FAQ.
- Tenant selection from step 1's session storage is verified against `tenant_users` for `auth.getUser()`. Without a stored selection, exactly one membership is required. All business reads, updates, and deletes explicitly filter `tenant_id`; inserts include it. Existing anon/Auth clients and RLS enforce access.

Schema source: backend `supabase/migrations/001_phase1_schema.sql` through `004_admin_onboarding_rls.sql`. No schema changes are required.

Columns used:
- `assistant_profiles`: `tenant_id`, `assistant_name`, `allowed_languages`, `tone`, `style_profile_md`.
- `knowledge_items`: `id`, `tenant_id`, `question`, `answer`, `type`, `language`, `active`, `source`, `created_at` (ordering). New items use `type='faq'`, `language='he'`, `active=true`, `source='manual'`; IDs and timestamps use database defaults. Editing preserves service fields.

Manual verification with an authenticated tenant account:
1. Open step 2, check saved profile values, reject a whitespace-only name, change fields, save, reopen and verify persistence.
2. Follow Next → Skip to step 4 (skipping does not create a WhatsApp session). Add a FAQ, reload, edit and reload, delete and reload; verify persistence after each operation.
3. Finish with zero FAQ and verify navigation to `/admin`.
4. Verify unauthenticated visits to steps 2–4 redirect to login. A foreign tenant ID in session storage must fail membership validation. Verify RLS separately using two authenticated tenant accounts.
5. Confirm denied or failed writes display errors and preserve form data.

TODO:
- Greeting has no column in `assistant_profiles` migrations 001–004, so no greeting input is implemented.
- `/admin` does not exist in this foundation yet; Finish targets that requested route, which currently returns 404. Dashboard implementation remains out of scope.


Automated tenant resolution checks: `node --test tests/onboarding-tenant.test.cjs` (mocked Auth and membership responses; these do not replace live RLS/CRUD verification).

## WhatsApp QR connection

Set these **server-only** variables in Vercel and redeploy:
- `LEIA_API_URL=https://leya.bizgenie.site`
- `LEIA_ADMIN_API_KEY`: the same value as backend `ADMIN_SECRET` (never use a `NEXT_PUBLIC_` prefix).

The browser calls only `/api/waha/create`, `/api/waha/status`, and `/api/waha/qr` on this Next.js app. Every route validates `auth.getUser()` using the existing Supabase SSR client and resolves the sole membership from `tenant_users` by authenticated `user_id`. Missing/ambiguous memberships and viewer roles are rejected. Client bodies/query parameters never select a tenant. Middleware is unchanged: the page is already protected, and API handlers perform their own authentication and return JSON 401 responses.

Backend contracts verified in `src/routes/admin.ts`, `src/utils/admin-auth.ts`, `src/services/waha-admin.service.ts`, and the WhatsApp provider:
- `POST /api/admin/waha/create`: JSON `{ tenantId }`; response `{ session, status: string }`.
- `GET /api/admin/waha/status?tenantId=...`: response `{ session, status: { status: string, connected?: boolean } }`.
- `GET /api/admin/waha/qr?tenantId=...`: binary image with backend Content-Type (provider requests PNG).
- All calls use `Authorization: Bearer <LEIA_ADMIN_API_KEY>`, accepted by backend `requireAdmin` against `ADMIN_SECRET`.

The proxy returns only normalized status or binary QR, disables caching, rejects upstream redirects, and limits each upstream fetch to 10 seconds. Logs contain only fixed event names, operation and HTTP status; no secrets, QR contents or raw upstream bodies. The create route also checks request Origin.

Click Connect to inspect/reuse an existing session or create/start one. Status polling runs every 3 seconds without overlapping requests, for at most 3 minutes per attempt. WORKING/CONNECTED stops polling and enables Next. Refresh QR fetches the current QR during a new polling attempt; Skip never creates a session. Navigation aborts pending browser requests and releases the QR object URL.

Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `node --test tests/*.test.cjs`.

Live acceptance checks with an owner account: Connect → scan QR → Connected → Next; refresh QR before scanning; leave the page during polling; wait three minutes without scanning; verify Skip on a fresh visit creates no session. Confirm anonymous API calls return 401 and cross-origin create returns 403. Automated proxy tests mock Supabase and backend responses; they do not prove live WhatsApp pairing.

WhatsApp TODO:
- No endpoint forces QR regeneration; Refresh retrieves the currently available QR without disconnecting/restarting the session.
- Multi-tenant accounts need a server-side current-tenant selection mechanism; this implementation fails closed when membership is ambiguous.
- Configure the server environment in Vercel and run live pairing acceptance checks.

## Email confirmation and password recovery

Public routes: `/login`, `/forgot-password`, `/auth/callback`. Protected route: `/reset-password` (middleware plus server-side `getUser()`).

Signup uses the current browser origin plus `/auth/callback` as `emailRedirectTo`. With confirmation enabled, a successful signup without a session displays the check-email screen and a signup resend button. With confirmation disabled, signup redirects directly to step 1. Callback exchanges the PKCE `code` with the existing cookie-based server client; success defaults to step 1, or a safe same-origin `next` path. Recovery uses the same exchange and `/reset-password`. Callback errors are mapped to fixed Russian login messages; auth codes, tokens and raw upstream descriptions are never logged or reflected.

Password recovery always displays the same acknowledgement regardless of whether the email exists or the request failed. Reset requires matching passwords and an active authenticated session before `updateUser`, then redirects to step 1. Supabase enforces the project's actual password policy. No unverified numeric minimum is hardcoded: the public Auth settings endpoint does not expose it, and the dashboard required sign-in during implementation. A minimum reported by Supabase's weak-password error is displayed in Russian.

The Supabase redirect allow-list must permit `/auth/callback` and `/auth/callback?next=/reset-password` on each supported application origin; a bare Site URL alone does not cover those paths. Open PKCE email links in the same browser that requested them so the verifier cookie is available.

`getOnboardingTenant()` now returns `role` and a bound `requireRole(['owner', 'admin'])` guard. Step 2 and all step 4 writes check it before mutation. WAHA uses the same exported guard on the server. Roles come from `022_tenant_users.sql`: owner, admin, viewer.

Auth verification: `node --test tests/*.test.cjs` covers callback success/failure, cookie writes, recovery and safe redirects; signup with/without session and resend; identical password-recovery responses; password confirmation/update; role rejection and WAHA regressions. Auth services are mocked; live mailbox delivery and real account updates are not exercised.

Remaining follow-up:
- Verify the numeric minimum in Supabase's Email provider settings if client-side minimum-length validation is desired; backend policy is authoritative already.
- Run live signup → email confirmation and forgot-password → email link → password reset on the deployed origin.
- Migration 022 currently grants business writes based on membership, without a role predicate. The new client guard blocks viewer mutations in this UI, but database-enforced role restrictions require a separate RLS migration (not changed here).
