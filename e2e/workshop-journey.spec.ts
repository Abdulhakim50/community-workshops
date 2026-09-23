import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const organizerEmail = `browser-organizer-${runId}@example.test`;
const organizerPassword = "browser-test-password";
const workshopTitle = `Browser Journey ${runId}`;
const firstAttendeeEmail = `browser-first-${runId}@example.test`;
const secondAttendeeEmail = `browser-second-${runId}@example.test`;

async function registerAttendee(page: Page, name: string, email: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /Register|Join waitlist/ }).click();
}

test.afterAll(async () => {
  if (!process.env.DATABASE_URL) return;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("begin");
    const organizer = await pool.query<{ id: string }>(
      'select id from organizers where contact_email = $1',
      [organizerEmail],
    );

    if (organizer.rows[0]) {
      await pool.query(
        'delete from registrations where workshop_id in (select id from workshops where organizer_id = $1)',
        [organizer.rows[0].id],
      );
      await pool.query('delete from workshops where organizer_id = $1', [organizer.rows[0].id]);
      await pool.query('delete from organizers where id = $1', [organizer.rows[0].id]);
    }
    await pool.query('delete from "user" where email = $1', [organizerEmail]);
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  } finally {
    await pool.end();
  }
});

test("organizer publishes a workshop and manages registration through check-in", async ({ browser }) => {
  test.skip(!process.env.DATABASE_URL, "The browser journey requires PostgreSQL.");

  const organizerContext = await browser.newContext();
  const attendeeContext = await browser.newContext();
  const organizerPage = await organizerContext.newPage();
  const attendeePage = await attendeeContext.newPage();

  try {
    await organizerPage.goto("/organizer/sign-up");
    await organizerPage.getByLabel("Organizer name").fill("Browser Test Organizer");
    await organizerPage.getByLabel("Email").fill(organizerEmail);
    await organizerPage.getByLabel("Password").fill(organizerPassword);
    await organizerPage.getByRole("button", { name: "Create organizer account" }).click();
    await expect(organizerPage.getByRole("heading", { name: "Hello, Browser Test Organizer" })).toBeVisible();

    await organizerPage.getByRole("link", { name: "Create workshop" }).click();
    await organizerPage.getByLabel("Title").fill(workshopTitle);
    await organizerPage.getByLabel("Short summary").fill("A browser-tested community workshop journey.");
    await organizerPage.getByLabel("Full description").fill("This workshop exists to verify the complete organizer and attendee browser journey.");
    await organizerPage.getByLabel("Category").fill("Testing");
    await organizerPage.getByLabel("What attendees will learn").fill("Register for a limited seat\nUse a private cancellation link");
    await organizerPage.getByLabel("Starts").fill("2035-05-10T10:00");
    await organizerPage.getByLabel("Ends").fill("2035-05-10T12:00");
    await organizerPage.getByLabel("Time zone").fill("America/Los_Angeles");
    await organizerPage.getByLabel("Venue").fill("Browser Test Hall");
    await organizerPage.getByLabel("Street address").fill("100 Test Avenue");
    await organizerPage.getByLabel("Number of seats").fill("1");
    await organizerPage.getByRole("button", { name: "Create draft" }).click();
    await expect(organizerPage.getByText("Draft created.")).toBeVisible();

    await organizerPage.getByRole("button", { name: "Publish workshop" }).click();
    await expect(organizerPage.getByText("Workshop published.")).toBeVisible();

    await attendeePage.goto("/workshops");
    await attendeePage.getByRole("link", { name: workshopTitle }).click();
    await expect(attendeePage).toHaveURL(/\/workshops\/[^/]+$/);
    const workshopPath = new URL(attendeePage.url()).pathname;

    await registerAttendee(attendeePage, "First Browser Attendee", firstAttendeeEmail);
    await expect(attendeePage.getByRole("heading", { name: "Your seat is confirmed" })).toBeVisible();
    const cancellationPath = await attendeePage.getByRole("link", { name: "manage registration" }).getAttribute("href");
    expect(cancellationPath).toBeTruthy();

    await attendeePage.goto(workshopPath);
    await registerAttendee(attendeePage, "Second Browser Attendee", secondAttendeeEmail);
    await expect(attendeePage.getByRole("heading", { name: "You joined the waitlist" })).toBeVisible();
    await expect(attendeePage.getByText("You are number 1 on the waitlist.")).toBeVisible();

    await organizerPage.getByRole("link", { name: "Attendees" }).click();
    await expect(organizerPage.getByText("1 / 1")).toBeVisible();
    await expect(organizerPage.getByText(firstAttendeeEmail)).toBeVisible();
    await expect(organizerPage.getByText(secondAttendeeEmail)).toBeVisible();

    const firstAttendee = organizerPage.getByRole("listitem").filter({ hasText: firstAttendeeEmail });
    await firstAttendee.getByRole("button", { name: "Check in" }).click();
    await expect(organizerPage.getByText("Attendance updated.")).toBeVisible();
    await expect(firstAttendee.getByText("Checked in")).toBeVisible();

    await attendeePage.goto(cancellationPath!);
    await attendeePage.getByRole("button", { name: "Cancel my registration" }).click();
    await expect(attendeePage.getByRole("heading", { name: "Your registration is canceled" })).toBeVisible();
    await expect(attendeePage.getByText("The first person on the waitlist has been given the open seat.")).toBeVisible();

    await organizerPage.reload();
    await expect(organizerPage.getByRole("heading", { name: "Waitlist" }).locator("..").getByText("No one is waiting for a seat.")).toBeVisible();
    await expect(organizerPage.getByRole("heading", { name: "Confirmed attendees" }).locator("..").getByText(secondAttendeeEmail)).toBeVisible();
    await expect(organizerPage.getByRole("heading", { name: "Canceled registrations" }).locator("..").getByText(firstAttendeeEmail)).toBeVisible();
  } finally {
    await organizerContext.close();
    await attendeeContext.close();
  }
});
