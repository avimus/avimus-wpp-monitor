---
description: "Task list for Painel de Monitoramento de InstÃ¢ncias WhatsApp"
---

# Tasks: Painel de Monitoramento de InstÃ¢ncias WhatsApp

**Input**: Design documents from `specs/001-whatsapp-monitor-dashboard/`

**Prerequisites**: plan.md âœ… | spec.md âœ… | research.md âœ… | data-model.md âœ… | contracts/ âœ…

**Tests**: Not included â€” no automated tests requested in this feature scope.

**Organization**: Tasks grouped by user story for independent implementation and delivery.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1â€“US4)
- File paths are relative to repository root

## Path Conventions

- Pages: `src/app/(dashboard)/...` and `src/app/(auth)/...`
- API Routes: `src/app/api/.../route.ts`
- Components: `src/components/...`
- Lib: `src/lib/...`
- Types: `src/types/index.ts`
- DB migrations: `supabase/migrations/`

---

## Phase 1: Setup

**Purpose**: Project initialization, dependencies, and shared types

- [x] T001 Initialize Next.js 14 project with TypeScript, Tailwind CSS, ESLint, App Router, and `src/` directory (`npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`)
- [x] T002 [P] Install Supabase dependencies (`@supabase/ssr`, `@supabase/supabase-js`) and create `src/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WORLDMENSAGE_BASE_URL`, `WORLDMENSAGE_TOKEN`, `CRON_SECRET`
- [x] T003 [P] Initialize shadcn/ui (`npx shadcn@latest init`) and add components: Card, Badge, Dialog, Table, Button, Sonner (`npx shadcn@latest add card badge dialog table button sonner`)
- [x] T004 [P] Install additional dependencies: `lucide-react`, `date-fns` (`npm install lucide-react date-fns`)
- [x] T005 [P] Create TypeScript type definitions in `src/types/index.ts` â€” export `InstanceStatus` enum (`connected | disconnected | delivery_failure | reconnecting`), `UserRole` enum (`admin | contractor`), `Profile`, `Instance`, `StatusLog` interfaces matching data-model.md schema

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, auth infrastructure, and shared lib â€” MUST complete before any user story

**âš ï¸ CRITICAL**: No user story implementation can begin until this phase is complete

- [x] T006 Create Supabase project and run all migrations in order in `supabase/migrations/`: `001_create_enums.sql` (InstanceStatus + UserRole enums), `002_create_profiles.sql` (profiles table + RLS + auto-create trigger on auth.users), `003_create_instances.sql` (instances table + indexes + RLS + `is_admin()` function), `004_create_status_logs.sql` (status_logs table + indexes + RLS), `005_retention_cleanup.sql` (delete function for logs older than 90 days)
- [x] T007 [P] Create Supabase browser client in `src/lib/supabase/client.ts` â€” exports `createBrowserClient()` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; used in Client Components
- [x] T008 [P] Create Supabase server client in `src/lib/supabase/server.ts` â€” exports `createServerClient()` reading cookies from Next.js headers; used in Server Components, Server Actions, and API Routes
- [x] T009 [P] Create Supabase middleware client in `src/lib/supabase/middleware.ts` â€” exports `createServerClient()` with cookie read/write via NextRequest/NextResponse; used exclusively in `src/middleware.ts`
- [x] T010 [P] Create Worldmensage API wrapper in `src/lib/worldmensage/client.ts` â€” exports `createInstance()` (POST to `${WORLDMENSAGE_BASE_URL}/instance-create` with `{ token }` in body, returns `{ status, qrcode, instance }`) and `sendText()` (POST `/send-text` with `{ token, phone, message }`, returns `{ erro: boolean }`)
- [x] T011 Create Next.js auth middleware in `src/middleware.ts` â€” uses `src/lib/supabase/middleware.ts`; matches `/(dashboard)/(.*)` routes; calls `supabase.auth.getUser()` to validate session; redirects unauthenticated users to `/login`; refreshes session cookie on each request
- [x] T012 Create login page with email/password form in `src/app/(auth)/login/page.tsx` â€” Client Component; calls `supabase.auth.signInWithPassword({ email, password })`; redirects to `/` on success; shows inline error on failure
- [x] T013 Configure Supabase Realtime on `instances` table â€” in Supabase Dashboard go to Database â†’ Replication â†’ enable `instances` table; verify RLS is active on `profiles`, `instances`, and `status_logs` tables

**Checkpoint**: Database ready, auth works, Worldmensage client ready â€” user story implementation can now begin

---

## Phase 3: User Story 1 â€” Contratante Visualiza Status em Tempo Real (Priority: P1) ðŸŽ¯ MVP

**Goal**: Authenticated contractor can see the live status of all their instances (Conectada / Desconectada / Falha na Entrega / Reconectando) with automatic updates

**Independent Test**: Log in as a contractor; dashboard loads and shows all assigned instances with correct status badges; change an instance status in Supabase directly â€” badge updates within 5 seconds without page refresh

### Implementation for User Story 1

- [x] T014 [P] [US1] Create `StatusBadge` component in `src/components/instances/StatusBadge.tsx` â€” accepts `status: InstanceStatus` prop; renders shadcn `Badge` with distinct color and icon per state: `connected` (green + CheckCircle), `disconnected` (red + XCircle), `delivery_failure` (orange + AlertTriangle), `reconnecting` (blue + Loader2 spinner)
- [x] T015 [P] [US1] Create `InstanceCard` component in `src/components/instances/InstanceCard.tsx` â€” accepts `instance: Instance` prop; renders shadcn `Card` with instance name, `StatusBadge`, formatted `last_sync_at` (date-fns `formatDistanceToNow`); accepts optional `onReconnect` callback (used in US2) and `showHistory` link (used in US4); marks card with stale indicator when `last_sync_at` is older than 60 seconds
- [x] T016 [US1] Create contractor dashboard page in `src/app/(dashboard)/page.tsx` â€” Server Component; fetches contractor's instances via `src/lib/supabase/server.ts` using `SELECT * FROM instances WHERE contractor_id = auth.uid()` (RLS enforces ownership automatically); passes instances to `DashboardClient` Client Component
- [x] T017 [US1] Create `DashboardClient` Client Component in `src/components/instances/DashboardClient.tsx` â€” receives initial instances list; subscribes to Supabase Realtime channel `instances-status` filtering `UPDATE` events on `instances` table where `contractor_id = eq.{userId}`; updates local state on each event payload; renders list of `InstanceCard` components
- [x] T018 [P] [US1] Create `GET /api/instances/[id]/status` route in `src/app/api/instances/[id]/status/route.ts` â€” validates session; fetches instance by id from DB (RLS enforces ownership); returns `{ instance_id, status, last_sync_at, stale: boolean }` where `stale = true` if `last_sync_at` is older than 30 seconds

**Checkpoint**: User Story 1 is fully functional â€” contractor can view live instance statuses

---

## Phase 4: User Story 2 â€” Contratante Reconecta InstÃ¢ncia via QR Code (Priority: P1) ðŸŽ¯ MVP

**Goal**: Contractor can reconnect a disconnected instance by clicking "Reconectar", scanning the QR Code displayed on screen, and seeing the status automatically update to Conectada â€” without contacting support

**Independent Test**: Set an instance to `disconnected` in DB; click "Reconectar" on the card; QR Code modal appears; simulate scanning by calling the Worldmensage webhook with `connection: "open"` â€” modal closes and card shows `connected`

### Implementation for User Story 2

- [x] T019 [P] [US2] Create `QRCodeModal` component in `src/components/instances/QRCodeModal.tsx` â€” accepts `instanceId`, `qrcode` (base64), `onClose` props; displays `<img src={qrcode}>` in shadcn `Dialog`; shows 30-second countdown timer using `useEffect`; shows "Gerar novo QR Code" button when timer reaches 0 (calls `onRegenerate` prop); subscribes to Realtime `instances` UPDATE for this instanceId â€” transitions to "Reconectando..." display when status = `reconnecting`, auto-closes with success toast when status = `connected`
- [x] T020 [US2] Create `POST /api/instances/[id]/qrcode` route in `src/app/api/instances/[id]/qrcode/route.ts` â€” validates session; fetches instance (RLS enforces ownership); returns 409 if `current_status !== 'disconnected'`; calls `createInstance()` from `src/lib/worldmensage/client.ts`; updates `instances.current_status` to `reconnecting` and `worldmensage_instance_id` if changed; returns `{ qrcode, expires_in_seconds: 30 }`; returns 502 on Worldmensage failure
- [x] T021 [US2] Wire "Reconectar" button into `InstanceCard` in `src/components/instances/InstanceCard.tsx` â€” show shadcn `Button` ("Reconectar") only when `instance.current_status === 'disconnected'`; on click: call `POST /api/instances/{id}/qrcode`, receive qrcode, open `QRCodeModal`; handle regeneration (re-call same endpoint); show error toast if API fails
- [x] T022 [US2] Create `POST /api/webhook/worldmensage` route in `src/app/api/webhook/worldmensage/route.ts` â€” **public endpoint, no session validation**; parses body `{ type, instance, connection }`; ignores events where `type !== 'connection'`; maps `connection` to internal status (`open` â†’ `connected`, `close` â†’ `disconnected`); uses Supabase Service Role client to: (1) find instance by `worldmensage_instance_id`, (2) skip if status unchanged, (3) update `instances.current_status` + `last_sync_at`, (4) set `ended_at = now()` on previous open `status_logs` entry, (5) insert new `status_logs` entry with `contractor_id` copied from instance; always returns HTTP 200
- [x] T023 [US2] Register webhook URL in Worldmensage â€” configure `https://{VERCEL_DOMAIN}/api/webhook/worldmensage` as the callback URL in the Worldmensage account dashboard; verify webhook fires by triggering a connection/disconnection event and checking Vercel function logs

**Checkpoint**: User Stories 1 AND 2 fully functional â€” core MVP complete and independently testable

---

## Phase 5: User Story 3 â€” Administrador Gerencia Contratantes e InstÃ¢ncias (Priority: P2)

**Goal**: Admin can create contractors, assign WhatsApp instances to them, and view a consolidated status overview of all instances across all contractors

**Independent Test**: Log in as admin; create a new contractor via the admin form; assign an instance; log in as that contractor â€” they see only their instance with correct status

### Implementation for User Story 3

- [x] T024 [P] [US3] Create admin layout with role guard in `src/app/(dashboard)/admin/layout.tsx` â€” Server Component; reads profile from `profiles` table using Supabase server client; redirects to `/` if `role !== 'admin'`
- [x] T025 [P] [US3] Create `POST /api/admin/contractors` route in `src/app/api/admin/contractors/route.ts` â€” validates admin role; accepts `{ name, email }`; creates Supabase Auth user via `supabase.auth.admin.createUser()` with `email_confirm: true`; inserts into `profiles` with `role: 'contractor'`; returns `{ contractor_id, email }`
- [x] T026 [P] [US3] Create `DELETE /api/admin/contractors/[id]` route in `src/app/api/admin/contractors/[id]/route.ts` â€” validates admin role; calls `supabase.auth.admin.deleteUser(id)` which cascades to profiles, instances, and status_logs via FK; returns `{ deleted: true }`
- [x] T027 [P] [US3] Create `POST /api/admin/instances` route in `src/app/api/admin/instances/route.ts` â€” validates admin role; accepts `{ contractor_id, name }`; calls `createInstance()` from worldmensage client; inserts into `instances` with returned `worldmensage_instance_id`; returns `{ instance_id, name, qrcode }` for initial pairing
- [x] T028 [P] [US3] Create `PATCH /api/admin/instances/[id]` route in `src/app/api/admin/instances/[id]/route.ts` â€” validates admin role; accepts `{ contractor_id }`; updates `instances.contractor_id`; updates `contractor_id` on all associated `status_logs`; returns updated instance
- [x] T029 [US3] Create `ContractorForm` component in `src/components/admin/ContractorForm.tsx` â€” controlled form with `name` (text) and `email` (email) fields; submits to `POST /api/admin/contractors`; shows success toast with contractor_id on success; shows error toast on failure
- [x] T030 [US3] Create `InstanceAssignForm` component in `src/components/admin/InstanceAssignForm.tsx` â€” contractor selector (dropdown populated from profiles list) + instance name text field; submits to `POST /api/admin/instances`; displays returned `qrcode` in a pairing modal after creation
- [x] T031 [US3] Create new contractor page in `src/app/(dashboard)/admin/contractors/new/page.tsx` â€” renders `ContractorForm`; redirects to `/admin/contractors` after successful creation
- [x] T032 [US3] Create contractors list page in `src/app/(dashboard)/admin/contractors/page.tsx` â€” Server Component; fetches all profiles with `role = 'contractor'` and their instance count; renders table (Name, Email, Instances, Actions) with link to new contractor page and delete button per row
- [x] T033 [US3] Create admin overview page in `src/app/(dashboard)/admin/page.tsx` â€” Server Component; fetches all instances with contractor name (join profiles); passes to Client Component with Realtime subscription; renders instances grouped by contractor with status badges
- [x] T034 [US3] Create instances management page in `src/app/(dashboard)/admin/instances/page.tsx` â€” Server Component; fetches all instances with contractor assignment; renders table with Instance Name, Contractor, Status, Last Sync; renders `InstanceAssignForm` for adding new instances

**Checkpoint**: User Story 3 complete â€” admin can fully manage the platform

---

## Phase 6: User Story 4 â€” Consulta de HistÃ³rico de Status (Priority: P3)

**Goal**: Contractor and admin can view the chronological history of status changes for any instance, with timestamps and duration per state

**Independent Test**: Navigate to `/instances/{id}` â€” table shows all status_log entries with Status, Start, End, Duration columns in reverse chronological order

### Implementation for User Story 4

- [x] T035 [P] [US4] Create instance history page in `src/app/(dashboard)/instances/[id]/page.tsx` â€” Server Component; fetches instance (validates ownership via RLS) and its `status_logs` ordered by `recorded_at DESC`; renders shadcn `Table` with columns: Status (StatusBadge), InÃ­cio (formatted timestamp), Fim (formatted or "atual"), DuraÃ§Ã£o (calculated from recorded_at and ended_at using date-fns)
- [x] T036 [US4] Add "Ver histÃ³rico" link to `InstanceCard` in `src/components/instances/InstanceCard.tsx` â€” render `<Link href="/instances/{id}">Ver histÃ³rico</Link>` at bottom of card using Next.js Link component
- [x] T037 [US4] Validate status_log closure logic in `src/app/api/webhook/worldmensage/route.ts` â€” verify that when a new status arrives, the query `UPDATE status_logs SET ended_at = now() WHERE instance_id = $1 AND ended_at IS NULL` runs before the INSERT of the new log entry; add integration smoke test by checking DB state after simulating two consecutive webhook calls

**Checkpoint**: All four user stories complete and independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: LGPD compliance, UX improvements, and end-to-end validation

- [x] T038 [P] Create privacy policy page in `src/app/privacy/page.tsx` â€” static Server Component page describing: data collected (name, email, instance IDs, status logs), 90-day log retention policy, right to account deletion, contact for LGPD requests; add link to `/privacy` in dashboard footer
- [x] T039 Create LGPD log cleanup Cron endpoint and Vercel configuration â€” create `src/app/api/cron/cleanup-logs/route.ts` (validates `Authorization: Bearer {CRON_SECRET}` header; uses Service Role client to `DELETE FROM status_logs WHERE recorded_at < NOW() - INTERVAL '90 days'`; returns `{ deleted_count }`); add `vercel.json` at repo root with `{ "crons": [{ "path": "/api/cron/cleanup-logs", "schedule": "0 2 * * *" }] }`
- [x] T040 [P] Add global toast provider to root layout in `src/app/layout.tsx` â€” import and render `<Toaster />` from `sonner` in the root layout; verify toasts appear for: QR Code generation success/failure, reconnection success, admin form submissions
- [x] T041 [P] Add loading and error UI to dashboard route group â€” create `src/app/(dashboard)/loading.tsx` (renders skeleton cards for instance list) and `src/app/(dashboard)/error.tsx` (renders error message with retry button using Next.js error boundary conventions)
- [ ] T042 Run end-to-end validation per `specs/001-whatsapp-monitor-dashboard/quickstart.md` checklist â€” verify all 14 checklist items pass in Vercel Preview environment before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies â€” start immediately; T002â€“T005 all parallel after T001
- **Foundational (Phase 2)**: Requires Phase 1 complete; T007â€“T010 parallel after T006; T011 requires T009; T012 requires T007+T011
- **US1 (Phase 3)**: Requires Phase 2 â€” T014+T015+T018 parallel; T016 requires T014+T015; T017 requires T016
- **US2 (Phase 4)**: Requires Phase 2 â€” T019 parallel; T020 requires T010 (worldmensage client); T021 requires T019+T020; T022 requires T008 (service role); T023 after T022 deployed
- **US3 (Phase 5)**: Requires Phase 2 â€” T024â€“T028 all parallel; T029â€“T030 require T025â€“T028; T031â€“T034 require T029â€“T030
- **US4 (Phase 6)**: Requires Phase 3 (InstanceCard) and Phase 4 (webhook closes logs) â€” T035 parallel; T036 requires T035; T037 validates T022
- **Polish (Phase 7)**: Requires all user stories complete â€” T038+T040+T041 parallel; T039 independent; T042 last

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only â€” no other story dependency
- **US2 (P1)**: Depends on Foundational only â€” shares InstanceCard with US1 (T015); T021 extends T015
- **US3 (P2)**: Depends on Foundational only â€” no dependency on US1/US2
- **US4 (P3)**: Depends on US1 (InstanceCard T015) for "Ver histÃ³rico" link; depends on US2 (webhook T022) for correct log closure

### Within Each User Story

- Components before pages
- API routes before component integration
- Webhook before Realtime validation

### Parallel Opportunities

```bash
# Phase 1 â€” after T001:
T002, T003, T004, T005  # all parallel

# Phase 2 â€” after T006:
T007, T008, T009, T010  # all parallel
# then: T011 (needs T009), T012 (needs T007+T011), T013 (independent)

# US1 â€” simultaneously:
T014, T015, T018  # all parallel
# then: T016 (needs T014+T015), T017 (needs T016)

# US2 â€” simultaneously:
T019, T020  # parallel
# then: T021 (needs T019+T020), T022, T023

# US3 â€” simultaneously:
T024, T025, T026, T027, T028  # all parallel
# then: T029, T030 (parallel, need T025-T028)
# then: T031, T032, T033, T034 (parallel, need T029-T030)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational â€” **CRITICAL: blocks all stories**
3. Complete Phase 3: US1 â€” contractors see live status
4. Complete Phase 4: US2 â€” contractors reconnect via QR Code
5. **STOP and VALIDATE**: Run quickstart.md checklist items 1â€“10
6. Configure webhook (T023) and deploy to Vercel Preview

### Incremental Delivery

1. Setup + Foundational â†’ infrastructure ready
2. US1 â†’ contractors can monitor status (read-only MVP)
3. US2 â†’ contractors can self-serve reconnection (**full core value delivered**)
4. US3 â†’ admin can onboard contractors (operational self-sufficiency)
5. US4 â†’ historical visibility (analytics and diagnostics)
6. Polish â†’ LGPD compliance + UX refinements

### Parallel Team Strategy (if applicable)

Once Foundational (Phase 2) is complete:

- **Developer A**: US1 (T014â€“T018) â€” dashboard and Realtime
- **Developer B**: US2 (T019â€“T023) â€” QR Code flow and webhook
- Stories integrate naturally via InstanceCard (T015) which both extend

---

## Notes

- **[P]** = different files, no dependencies on incomplete tasks in same phase
- **[USN]** label maps every task to its user story for delivery traceability
- Webhook endpoint (T022) must be deployed before T023 (manual Worldmensage config)
- `worldmensage_instance_id` may change on reconnection â€” T020 handles the update
- Service Role key is used only in T022 (webhook) and T039 (cron) â€” never in client-side code
- All Supabase queries in pages/components rely on RLS â€” no explicit `contractor_id` filters needed in application code
- Verify Worldmensage rate limits before deploying (see `contracts/worldmensage-api.md`)


