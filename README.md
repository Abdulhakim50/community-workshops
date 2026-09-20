# Community Workshops

A web application for organizers to publish free, in-person workshops and manage limited seats. Attendees can register, join a waitlist when an event is full, and cancel. When a seat opens, the next person on the waitlist can be promoted. Organizers can view registrations and check people in.

## Status

The application foundation is in place: a home page, a workshops route, and a shared responsive layout. The workshops page is an honest empty state until workshop data and organizer tools are built. Registration is not available yet.

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
