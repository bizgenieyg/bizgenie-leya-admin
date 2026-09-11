# Leya Admin

Next.js 14 App Router foundation for the Leya tenant admin panel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase project URL, public anon key, and Leya backend URL.
3. Run `npm install`.
4. Run `npm run dev`.

The frontend must never receive a Supabase service-role key.

## Database handoff

Production migrations are maintained only in the backend repository at `bizgenie-leya/supabase/migrations`. This repository keeps reduced schema fixtures under `tests/fixtures` for integration tests.

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
- `/admin` is the permanent tenant cabinet; Finish opens it even with zero FAQ.


Automated tenant resolution checks: `node --test tests/onboarding-tenant.test.cjs` (mocked Auth and membership responses; these do not replace live RLS/CRUD verification).

## WhatsApp QR connection

Set these **server-only** variables in Vercel and redeploy:
- `LEYA_API_URL=https://leya.bizgenie.site`
- `LEYA_ADMIN_API_KEY`: the same value as backend `ADMIN_SECRET` (never use a `NEXT_PUBLIC_` prefix).

The browser calls only `/api/waha/create`, `/api/waha/status`, `/api/waha/qr`, and `/api/waha/reconnect` on this Next.js app. Every route validates `auth.getUser()` using the existing Supabase SSR client and resolves the sole membership from `tenant_users` by authenticated `user_id`. Missing/ambiguous memberships and viewer roles are rejected. Client bodies/query parameters never select a tenant. Middleware is unchanged: the page is already protected, and API handlers perform their own authentication and return JSON 401 responses.

Backend contracts verified in `src/routes/admin.ts`, `src/utils/admin-auth.ts`, `src/services/waha-admin.service.ts`, and the WhatsApp provider:
- `POST /api/admin/waha/create`: JSON `{ tenantId }`; response `{ session, status: string }`.
- `GET /api/admin/waha/status?tenantId=...`: response `{ session, status: { status: string, connected?: boolean } }`.
- `GET /api/admin/waha/qr?tenantId=...`: binary image with backend Content-Type (provider requests PNG).
- `POST /api/admin/waha/reconnect?tenantId=...`: no JSON body; response `{ session, status: string }`.
- All calls use `Authorization: Bearer <LEYA_ADMIN_API_KEY>`, accepted by backend `requireAdmin` against `ADMIN_SECRET`.

The proxy returns only normalized status or binary QR, disables caching, rejects upstream redirects, and limits each upstream fetch to 10 seconds. Logs contain only fixed event names, operation and HTTP status; no secrets, QR contents or raw upstream bodies. The create route also checks request Origin.

Connect first checks status. Only NOT_CREATED (an explicit session-not-found 404 or an empty backend response) triggers create. An HTML/route 404 is a backend error, not proof of a missing session. SCAN_QR_CODE shows QR immediately; WORKING/CONNECTED shows Connected and Next; FAILED/STOPPED shows a retry button. Retry checks status again and uses reconnect for a failed/stopped session. Unknown existing statuses never trigger create. Backend reconnect stops/starts the same session; automatic disconnect/create is not used because disconnect logs out and deletes it. Status polling runs every 3 seconds without overlap, for at most 3 minutes including initial checks, and stops on success, session failure, or unmount. QR is a native same-origin image at `/api/waha/qr?ts=<timestamp>`, refreshed every 20 seconds only while SCAN_QR_CODE. Manual refresh updates that timestamp without extending the polling deadline. The full phone instruction remains visible with the QR. Skip never creates a session.

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
- Apply the prepared migration 023 to enforce database-level owner/admin writes; it has not been applied to the deployed database.

## Atomic tenant creation — migration 023

The executable onboarding SQL is maintained in `bizgenie-leya/supabase/migrations`; test copies live under `tests/fixtures`.

**Application status: NOT APPLIED to the deployed database.** README and the original commit `2cece7d` describe 022 as a standalone owner handoff, not an executed migration. Neither repository's available Git history or scripts records whether it was applied through SQL Editor, CLI, or another script. Therefore no application method was inferred and no production migration was run. Establish the actual 022 procedure before applying 023. The new step 1 requires this RPC to exist; code deployment alone does not resolve the production error.

Function signature:
```sql
public.create_tenant_with_owner(
  p_name text,
  p_plan text,
  p_business_name text,
  p_language text,
  p_status text,
  p_trial_ends_at timestamptz
) returns uuid
```

The SECURITY DEFINER function has `SET search_path = public`, fully qualified tables, an `auth.uid()` check, and EXECUTE granted only to authenticated callers (PUBLIC/anon revoked). It creates the tenant, authenticated owner's membership, default assistant profile and the same three module settings previously created by step 1, all in one transaction. Inputs correspond to existing step-1 fields; `p_plan` maps to `tenants.tier`. No new table columns are introduced. Required names, existing language/plan choices and trial/status consistency are validated.

Write policies from 022 are replaced using DROP POLICY IF EXISTS + CREATE POLICY for all ten tables: assistant_profiles, clients, client_profiles, conversations, messages, knowledge_items, module_settings, usage_events, agent_actions, scheduled_jobs. Tenants receives the same role restriction for UPDATE/DELETE, with INSERT unconditionally denied. INSERT uses WITH CHECK, UPDATE uses USING and WITH CHECK, DELETE uses USING. Every role predicate selects membership for `auth.uid()` with `role IN ('owner','admin')`; tenants uses `id`, other tables use `tenant_id`. Restrictive guards prevent other permissive write policies from weakening these rules. SELECT policies remain unchanged.

Known broad bootstrap policies from backend 004 are removed. Direct tenant_users INSERT/UPDATE/DELETE privileges are revoked from anon/authenticated, preventing membership forgery or self-promotion. This preserves 022's original read-only client membership model. Existing SELECT policies and backend bypass roles are unaffected.

Prerequisites: backend schema 001, nullable tenants.phone as in 004, and 022. The migration is repeatable. Apply using the verified historical process for 022; do not assume `supabase db push` manages these standalone files.

Step 1 now issues one RPC, stores the returned tenant UUID, and navigates to step 2. Module initialization has moved into that RPC. Errors are human-readable; development-only logs contain fixed messages/error codes. Plan names and descriptions remain, prices are removed. The role guard is now in `lib/onboarding/roles.ts` with no browser-client imports; step 2/4 still use it as a UX guard. The sole backend URL configuration is server-only `LEYA_API_URL`.

Tests: `node --test tests/*.test.cjs`. The dev-only PGlite dependency runs real PostgreSQL in memory using a fixture copied from relevant backend 001 tables and migration 022. Tests apply 023 twice, compare unchanged SELECT policies, force a late module failure to verify rollback, check authenticated/anonymous RPC execution, and exercise owner/admin/viewer/foreign-tenant writes across every covered table. This isolated execution is not an application to Supabase and does not verify the deployed schema or its actual grants.

TODO: identify 022's actual application procedure, apply 023 using it, then verify live step 1 and viewer restrictions. Until then, production retains its current policies and the new RPC is unavailable unless separately installed.

### WAHA connection regression checks

The explicit proxy path map always resolves `/api/admin/waha/{create,status,qr,reconnect}` from the configured `LEYA_API_URL`; create sends tenantId in JSON, the other operations use the query. Tenant identity remains derived from server-side Auth membership. QR bodies stream through with the original Content-Type; create preserves HTTP 201. Raw backend errors are never displayed. Backend unavailability, session failure, and polling timeout have separate UI messages.

`tests/waha-connection.test.cjs` covers create/reuse/reconnect decisions and backend failures; `tests/waha-polling.test.cjs` uses controlled timers to verify status at 3 seconds, image refresh at 20 seconds, the three-minute deadline, and cleanup on WORKING/unmount. Proxy tests distinguish a route 404 from a missing session and verify all paths, payload placement, image bytes, and authorization.

Deployment TODO: verify Vercel's server-only `LEYA_API_URL` points to the intended Leya backend (normally `https://leya.bizgenie.site`) and complete real phone pairing. Local source paths already matched the backend mount; the previous source defect was broad status-to-create handling and ambiguous 404 classification, not a reproduced wrong path. Live production environment values and pairing were not changed by this patch.

## Tenant cabinet

`/admin` is covered by the existing `/admin/:path*` middleware matcher. It contains only WhatsApp status, FAQ, and assistant settings.

- `components/tenant/assistant-settings.tsx` is the former step-2 form, shared by `/admin` and the thin step-2 wrapper. In onboarding it advances to step 3; in the cabinet it saves in place with a confirmation message.
- `components/tenant/knowledge-editor.tsx` is the former step-4 CRUD editor, shared by `/admin` and the thin step-4 wrapper. Onboarding navigation is preserved. The cabinet displays “Пока нет ни одного вопроса” with an Add question button when empty.
- Both editors use the existing tenant resolver, explicit tenant filters, `requireRole`, and Supabase clients. Viewer forms are read-only; mutation handlers recheck permission. Existing role guard policies for assistant_profiles and knowledge_items were confirmed present in the deployed database during this task (read-only inspection).
- `components/tenant/whatsapp-status.tsx` reuses the existing status request helper and connected-state predicate. It fetches status on mount, links to step 3 for connection, and confirms before disconnecting. No automatic disconnect or session creation occurs on page load.
- `/api/waha/disconnect` extends the existing server proxy: POST `/api/admin/waha/disconnect?tenantId=...`, Authorization Bearer admin key, no client-supplied tenant ID. Backend `{ disconnected: true }` is normalized to DISCONNECTED. Owner/admin is required for disconnect; viewer can read status.

Tests cover shared editor saves in both contexts, FAQ CRUD, viewer mutation rejection, confirmation cancellation/success, and disconnect proxy authorization/contract. The backend status contract currently returns only status/connected, without a phone number, so the UI does not invent one.

Cabinet TODO: expose a phone number in the backend status contract if it should appear next to Connected; complete live pairing/disconnect acceptance tests after the existing backend session-registration problem is resolved. This cabinet task does not change the backend or repair WAHA session records.

## Shared WhatsApp session states

Step 3 and the cabinet render `components/tenant/whatsapp-connection.tsx`.
The cabinet wrapper only determines whether mutation controls are available.
Server-side tenant lookup and owner/admin authorization stay in the existing
proxy; no tenant identifier is accepted from the browser.

The backend now returns `{ status, qrAvailable, reason? }` (the proxy also accepts
the old nested status response during rollout). Five WAHA Core 2026.6.2 statuses:
STOPPED → Отключено/reconnect; STARTING → Подключаем.../spinner/poll;
SCAN_QR_CODE → instructions and auto-refreshing QR; WORKING → Подключено/Next
or confirmed disconnect; FAILED → Не удалось подключиться/safe reason/reconnect.
NOT_CREATED is a local absence marker and is the only state that permits create.
Unknown status text is displayed as received and offers reconnect.
The initial page load only reads status; it does not create a session.

Polling runs every 3 seconds, QR refresh every 20 seconds, capped at 3 minutes.
Terminal states and unmount cancel timers/requests. A timeout offers a fresh
status check. Backend HTTP 4xx remains a request error, not backend unavailable;
QR HTTP 409 retains the current status. Only network failures/5xx display
“Бэкенд недоступен”.

Checks: `node --test tests/*.test.cjs`, `npm run build`, `npm run lint`,
`npm run typecheck`. Tests cover every state in both screens, polling deadlines,
unmount, read-only viewers, disconnect confirmation, duplicate-create prevention,
4xx/5xx distinctions and tenant isolation.

Deployment note: use the backend commit with normalized status/idempotent create.
Live WAHA image version and GOWS markOnline support still require server
verification; see the backend README correction (2026.6.2 does not support the
top-level markOnline field for GOWS).

### Stage 1 environment-name compatibility

Server proxies prefer `LEYA_API_URL` and `LEYA_ADMIN_API_KEY`. During the migration window they fall back to deprecated `LEIA_API_URL` and `LEIA_ADMIN_API_KEY` and emit a deprecation warning without logging values. If both names are present, the `LEYA_*` value wins. The aliases will be removed only in stage 2 after the VPS and Vercel environments are confirmed.
