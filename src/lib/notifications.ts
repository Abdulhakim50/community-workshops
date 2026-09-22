import { Resend } from "resend";
import type {
  PromotionNotificationDetails,
  WorkshopNotificationDetails,
} from "@/lib/registration";

export type NotificationDelivery = "sent" | "skipped" | "failed";

type AttendeeNotification = PromotionNotificationDetails & (
  | { kind: "confirmed" }
  | { kind: "waitlisted"; position: number }
  | { kind: "promoted" }
);

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function formatSchedule(workshop: WorkshopNotificationDetails) {
  const date = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: workshop.timeZone,
  }).format(workshop.startsAt);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: workshop.timeZone,
    timeZoneName: "short",
  }).format(workshop.startsAt);
  return `${date} at ${time}`;
}

function getEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = (process.env.APP_URL ?? process.env.BETTER_AUTH_URL)?.trim().replace(/\/$/, "");
  if (!apiKey || !from || !appUrl) return undefined;
  return { apiKey, from, appUrl };
}

function buildContent(notification: AttendeeNotification, appUrl: string) {
  const cancellationUrl = `${appUrl}/registrations/cancel/${notification.cancellationToken}`;
  const workshopUrl = `${appUrl}/workshops/${notification.workshop.slug}`;
  const schedule = formatSchedule(notification.workshop);
  const statusLine = notification.kind === "confirmed"
    ? "Your seat is confirmed."
    : notification.kind === "waitlisted"
      ? `You are number ${notification.position} on the waitlist.`
      : "A seat opened and you are now confirmed.";
  const subject = notification.kind === "confirmed"
    ? `Confirmed: ${notification.workshop.title}`
    : notification.kind === "waitlisted"
      ? `Waitlisted: ${notification.workshop.title}`
      : `A seat is yours: ${notification.workshop.title}`;

  const text = [
    `Hello ${notification.attendeeName},`,
    "",
    statusLine,
    notification.workshop.title,
    schedule,
    `${notification.workshop.venue}, ${notification.workshop.address}`,
    "",
    `Workshop details: ${workshopUrl}`,
    `Cancel your registration: ${cancellationUrl}`,
    "",
    "Keep the cancellation link private. It gives access to manage this registration.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#17231f;max-width:600px;margin:0 auto">
      <p>Hello ${escapeHtml(notification.attendeeName)},</p>
      <h1 style="font-size:26px;line-height:1.2">${escapeHtml(statusLine)}</h1>
      <h2 style="font-size:20px">${escapeHtml(notification.workshop.title)}</h2>
      <p>${escapeHtml(schedule)}<br>${escapeHtml(notification.workshop.venue)}<br>${escapeHtml(notification.workshop.address)}</p>
      <p><a href="${escapeHtml(workshopUrl)}">View workshop details</a></p>
      <p><a href="${escapeHtml(cancellationUrl)}">Cancel your registration</a></p>
      <p style="font-size:13px;color:#596760">Keep the cancellation link private. It gives access to manage this registration.</p>
    </div>`;

  return { subject, text, html };
}

export async function sendAttendeeNotification(notification: AttendeeNotification): Promise<NotificationDelivery> {
  const configuration = getEmailConfiguration();
  if (!configuration) return "skipped";

  const content = buildContent(notification, configuration.appUrl);
  try {
    const { error } = await new Resend(configuration.apiKey).emails.send(
      {
        from: configuration.from,
        to: notification.attendeeEmail,
        ...content,
      },
      { idempotencyKey: `${notification.kind}/${notification.registrationId}` },
    );
    if (error) {
      console.error("Email provider rejected attendee notification", error);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Could not send attendee notification", error);
    return "failed";
  }
}
