# Community Workshops

A web application for organizers to publish free, in-person workshops and manage limited seats. Attendees can register, join a waitlist when an event is full, and cancel. When a seat opens, the next person on the waitlist can be promoted. Organizers can view registrations and check people in.

## Status

Repository created. Application development has not started yet.

## First release

- Public workshop list and detail pages
- Organizer account and workshop management
- Registration with a reliable seat limit and duplicate prevention
- Cancellation and ordered waitlist promotion
- Confirmation notifications and organizer check-in

Payments, team accounts, and online video integration are outside the first release.

## Planned stack

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM, Better Auth, Zod, Resend, Vitest, and Playwright. The application will be deployed only after its core workflow is working and tested.

## How we work

We will build one small feature at a time, explain its design, run it locally, verify important behavior, and commit the result. `main` should stay runnable. Feature branches and pull requests will make each change reviewable. Commit messages will describe the change, such as `feat: add workshop registration` or `fix: prevent overbooking`.
