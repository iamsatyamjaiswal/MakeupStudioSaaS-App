# JJ Makeup Studio & Beauty Academy — SaaS starter

Angular 21 + ASP.NET Core Web API + EF Core + SQLite. The code is organized by feature instead of keeping the public site, studio admin, and platform admin in one giant Angular component.

## Implemented in this package

- **Public website:** loads the active tenant and published services from the API; service search; responsive public-facing sections; animated entrance/hover transitions; booking form with service, date, time, customer details and notes; booking requests are persisted in SQLite.
- **Studio admin:** API login and role check; persisted service create/edit/publish/deactivate; persisted appointment list and booking status updates; persisted post draft/publish/edit/delete; dashboard counts come from API data rather than hard-coded demo metrics.
- **Platform admin:** Super Admin login; persisted tenant list, tenant creation and activation/suspension; metrics are calculated from the tenant API response, not sample workspaces.
- **Backend:** SQLite-backed EF Core; Identity password hashing and role storage; JWT authentication; tenant-scoped service, booking and post operations; persisted Studio and Platform reporting; audit activity; development-only seeded accounts.
- **Frontend architecture:** `core/auth`, `core/interceptors`, `features/public-site`, `features/studio-admin`, `features/platform-admin`, and typed API service.

## Requirements
- Node.js 22.12+ (Node 22 LTS recommended; Angular 21 supports modern LTS Node versions)
- npm 10+
- .NET 8 SDK (the API targets `net8.0`; your installed .NET 8 SDK can build it)

## Run backend
Open a terminal:
```powershell
cd backend\MakeupStudio.Api
dotnet restore
dotnet run
```
The API listens on `https://localhost:7001` and `http://localhost:5001` in the supplied launch profile. Swagger is enabled in Development. On first Development startup, EF Core creates `Data/makeupstudio-v2.db` and seeds roles, a tenant, services and local development users. The versioned filename intentionally avoids the old starter database schema: the earlier `makeupstudio.db` file is preserved, not deleted or migrated. Copy any needed data manually before switching production databases.

## Run frontend
In another terminal:
```powershell
cd frontend
npm install
npm start
```
Open `http://localhost:4200`. The frontend API URL and default tenant slug are in `src/environments/environment.ts`. A tenant-specific public site can be opened at `/site/{slug}` (for example `/site/jj-makeup-studio`).

## Local development accounts
- Studio Admin: `admin@jjmakeup.local`
- Super Admin: `superadmin@makeupstudio.local`
- Development password for both: `DevOnly!ChangeMe2026`

These are **local development credentials only**. Do not expose this database or keep these credentials in a deployed environment. Replace the seeded account flow with invite/reset flows before launch.

## Quick integration test
1. Start the API and confirm `https://localhost:7001/api/health` returns `status: ok`.
2. Start the Angular frontend and check that the public services load from the API.
3. Submit a booking with a future date/time.
4. Open **Studio login**, sign in with the Studio Admin credentials and confirm the booking appears under Appointments.
5. Confirm/complete/cancel the booking and refresh to verify persistence.
6. Create, edit, publish and deactivate a service; verify published services update on the public site.
7. Create a content post, publish it, and verify its status survives a refresh.
8. Open **Platform administration**, sign in with the Super Admin account, create a tenant and activate/suspend it. Open Studio **Reports & analytics** and Platform **Reports & analytics** to verify monthly bookings, status totals, service/tenant performance and completed-service-value summaries.

## Important boundaries before production
This is a functional local MVP, not a production-ready SaaS deployment. The SQLite database is suitable for development and a single instance, not a high-concurrency multi-instance production system. The current app still needs migrations, automated backend/frontend/integration tests, password reset/email verification, secrets from environment or secret storage, token renewal/revocation, CSRF/XSS review, rate limiting, upload storage, notifications (email/WhatsApp), audit review, backups and deployment hardening. Content posts are stored and managed by the API; the public homepage's portfolio tiles are still curated visual sections rather than a complete media upload/gallery CMS. Subscription plans are tenant metadata only; payment collection is not implemented. Reported “completed revenue” is the sum of completed booking price snapshots, not verified payment receipts.


## API smoke test

With the API running at `http://localhost:5001`, open PowerShell at the project root and run:

```powershell
.\scripts\smoke-test.ps1
```

The script checks Super Admin login, tenant creation, the newly created Studio Admin login, service publishing, public booking creation, admin booking visibility/status updates, and content API access. It creates a uniquely named test tenant, service, and booking in the local development database. See `docs/TEST-STATUS.md` for checks that have and have not been run.


## Studio booking management additions
- Studio Admin now supports walk-in booking creation and editing, initial advance capture during walk-in entry, a Confirmed Bookings queue sorted by nearest upcoming appointment, client/search filters, cancellation reasons, payment/advance records, balance due and booking history.
- New API routes: `POST /api/admin/bookings`, `PUT /api/admin/bookings/{id}`, `GET/POST /api/admin/bookings/{id}/payments`, `GET /api/admin/bookings/{id}/history`. Existing status route now records status history and cancellation details.
- `CreatedAt` is the server-side booking request timestamp; `AppointmentAt` remains the scheduled appointment. `PriceSnapshot` is the agreed pre-discount price and `DiscountAmount` is applied separately. Balance is calculated as price minus discount minus recorded payments.
- Development startup includes additive SQLite column/table creation for existing local DBs. Back up your database before running an updated build. For production, replace this startup patch with an EF Core migration before deployment.
- `CancellationRequested` is accepted as an admin status for future client cancellation request workflows; this package does not add a client self-service cancellation UI yet.
