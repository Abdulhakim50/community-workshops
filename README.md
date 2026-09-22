# Community Workshops

A web application for organizers to publish free, in-person workshops and manage limited seats. Attendees can register, join a waitlist when an event is full, and cancel. When a seat opens, the next person on the waitlist can be promoted. Organizers can view registrations and check people in.

## Status

The public browsing flow has a home page, a workshop list, and individual detail pages. With `DATABASE_URL` configured, the pages read published workshops and confirmed registration counts from PostgreSQL on each request. Without it, they show clearly labeled examples from `src/lib/workshops.ts`. The seed workshops are marked as fictional and cannot accept registrations. Organizers can create accounts, sign in, create, edit, publish, or cancel their own workshops, and review confirmed, waitlisted, and canceled attendees with attendance counts and check-in controls. Attendees register for real workshops by name and email; PostgreSQL transactions enforce capacity, prevent active duplicates, and assign ordered waitlist positions. Each new registration receives a private cancellation link and an email when delivery is configured. Canceling a confirmed registration immediately promotes and emails the earliest active waitlisted attendee.

## Run locally

Requires Node.js 20.9 or newer. From this folder:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:3000`. On Windows PowerShell, `npm.cmd` avoids script-execution policy issues. If your npm registry mirror times out, run `npm.cmd ci --registry=https://registry.npmjs.org`.

Useful checks:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

## Database development

The database schema is in `src/db/schema.ts` and `src/db/auth-schema.ts`, and reviewed SQL migrations are in `drizzle/`. PostgreSQL 18 is used locally and in CI. Create a local database, copy `.env.example` to `.env.local`, replace the example connection string, and set a random `BETTER_AUTH_SECRET` of at least 32 characters. `BETTER_AUTH_URL` must match the address used to open the site. `.env.local` is ignored by Git.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:verify
```

The migrations create organizers, workshops, registrations, and the account/session tables. The seed adds one fictional organizer, three demo workshops, and fictional confirmed registrations using `example.test` addresses. It is safe to rerun without duplicating those rows. The seeded organizer cannot be claimed by signing up with its email. New accounts get their own organizer profile and can only see workshops linked to that profile. When a database is configured but unavailable, the public pages show an error state; they do not silently switch to example content.

When changing the schema, run `npm.cmd run db:generate`, review the generated SQL, and commit both the schema and migration. Never commit `.env.local` or a real connection string.

## Email notifications

Registration confirmations, waitlist notices, and promotion notices use Resend. In production, set `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and a stable `CANCELLATION_TOKEN_SECRET` of at least 32 characters. `EMAIL_FROM` must use a domain verified in Resend. Without the Resend values, registration and cancellation still work and the application displays the private cancellation link in the browser, but no email is sent.

Notification requests use a registration-specific idempotency key. Provider failures never roll back a successful registration, cancellation, or promotion.

## First release

- Public workshop list and detail pages
- Organizer account and workshop management
- Registration with a reliable seat limit and duplicate prevention
- Organizer attendee views and check-in

Payments, team accounts, and online video integration are outside the first release.

## Planned stack

The current stack uses Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM, Better Auth, Zod, Resend, and Vitest. Playwright remains planned for browser testing. Deployment comes after the core workflow works and is tested.

## How we work

We will build one small feature at a time, explain its design, run it locally, verify important behavior, and commit the result. `main` should stay runnable. Feature branches and pull requests will make each change reviewable. Commit messages will describe the change, such as `feat: add workshop registration` or `fix: prevent overbooking`.
