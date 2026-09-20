# Community Workshops

A web application for organizers to publish free, in-person workshops and manage limited seats. Attendees can register, join a waitlist when an event is full, and cancel. When a seat opens, the next person on the waitlist can be promoted. Organizers can view registrations and check people in.

## Status

The public browsing flow is in place: a home page, a workshop list, and individual workshop detail pages. The three workshops are clearly labeled example content stored in `src/lib/workshops.ts`; they are not real events. The list also has an empty state for when no workshops are published. Organizer publishing, live seat counts, and registration are not available yet.

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
npm.cmd run build
```

## Database development

The database schema is in `src/db/schema.ts`, and reviewed SQL migrations are in `drizzle/`. PostgreSQL 18 is used locally and in CI. Create a local database, copy `.env.example` to `.env.local`, and replace the example connection string with your own. `.env.local` is ignored by Git.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:verify
```

The migration creates organizers, workshops, and registrations with status values, relationships, and basic constraints. The seed adds one fictional organizer, three example workshops, and fictional confirmed registrations using `example.test` addresses. It is safe to rerun without duplicating those rows. The public pages still use the example data module; connecting them to PostgreSQL is the next slice.

When changing the schema, run `npm.cmd run db:generate`, review the generated SQL, and commit both the schema and migration. Never commit `.env.local` or a real connection string.

## First release

- Public workshop list and detail pages
- Organizer account and workshop management
- Registration with a reliable seat limit and duplicate prevention
- Cancellation and ordered waitlist promotion
- Confirmation notifications and organizer check-in

Payments, team accounts, and online video integration are outside the first release.

## Planned stack

The installed foundation uses Next.js, React, TypeScript, and Tailwind CSS. PostgreSQL, Drizzle ORM, Better Auth, Zod, Resend, Vitest, and Playwright will be added when their features begin. Deployment comes after the core workflow works and is tested.

## How we work

We will build one small feature at a time, explain its design, run it locally, verify important behavior, and commit the result. `main` should stay runnable. Feature branches and pull requests will make each change reviewable. Commit messages will describe the change, such as `feat: add workshop registration` or `fix: prevent overbooking`.
