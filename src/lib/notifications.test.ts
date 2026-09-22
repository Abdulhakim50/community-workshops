import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAttendeeNotification } from "@/lib/notifications";

const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));

describe("attendee notifications", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    sendEmail.mockReset();
  });

  it("skips delivery without provider configuration", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("APP_URL", "http://localhost:3000");

    const result = await sendAttendeeNotification({
      kind: "confirmed",
      registrationId: "4d6afba8-d305-428a-a7df-3bbf92e28c02",
      cancellationToken: "a".repeat(43),
      attendeeName: "Test Attendee",
      attendeeEmail: "attendee@example.test",
      workshop: {
        title: "Test workshop",
        slug: "test-workshop",
        startsAt: new Date("2027-01-16T18:00:00.000Z"),
        endsAt: new Date("2027-01-16T20:00:00.000Z"),
        timeZone: "America/Los_Angeles",
        venue: "Test Room",
        address: "100 Test Street",
      },
    });

    expect(result).toBe("skipped");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends an idempotent confirmation with workshop and cancellation links", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Community Workshops <workshops@updates.example.com>");
    vi.stubEnv("APP_URL", "https://workshops.example.com/");
    sendEmail.mockResolvedValue({ data: { id: "email-id" }, error: null });

    const result = await sendAttendeeNotification({
      kind: "confirmed",
      registrationId: "4d6afba8-d305-428a-a7df-3bbf92e28c02",
      cancellationToken: "a".repeat(43),
      attendeeName: "Test <Attendee>",
      attendeeEmail: "attendee@example.test",
      workshop: {
        title: "Test workshop",
        slug: "test-workshop",
        startsAt: new Date("2027-01-16T18:00:00.000Z"),
        endsAt: new Date("2027-01-16T20:00:00.000Z"),
        timeZone: "America/Los_Angeles",
        venue: "Test Room",
        address: "100 Test Street",
      },
    });

    expect(result).toBe("sent");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Community Workshops <workshops@updates.example.com>",
        to: "attendee@example.test",
        subject: "Confirmed: Test workshop",
        text: expect.stringContaining("https://workshops.example.com/registrations/cancel/"),
        html: expect.stringContaining("Test &lt;Attendee&gt;"),
      }),
      { idempotencyKey: "confirmed/4d6afba8-d305-428a-a7df-3bbf92e28c02" },
    );
  });

  it("reports a provider rejection without throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Community Workshops <workshops@updates.example.com>");
    vi.stubEnv("APP_URL", "https://workshops.example.com");
    sendEmail.mockResolvedValue({ data: null, error: { message: "Rejected" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await sendAttendeeNotification({
      kind: "promoted",
      registrationId: "4d6afba8-d305-428a-a7df-3bbf92e28c02",
      cancellationToken: "a".repeat(43),
      attendeeName: "Test Attendee",
      attendeeEmail: "attendee@example.test",
      workshop: {
        title: "Test workshop",
        slug: "test-workshop",
        startsAt: new Date("2027-01-16T18:00:00.000Z"),
        endsAt: new Date("2027-01-16T20:00:00.000Z"),
        timeZone: "America/Los_Angeles",
        venue: "Test Room",
        address: "100 Test Street",
      },
    });

    expect(result).toBe("failed");
  });
});
