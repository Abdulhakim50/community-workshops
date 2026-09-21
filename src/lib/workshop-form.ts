import { z } from "zod";

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function localDateTimeToDate(value: string, timeZone: string) {
  if (!localDateTimePattern.test(value) || !isTimeZone(timeZone)) return undefined;

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;

  // Correct a UTC-shaped timestamp until it displays as the requested local time.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const displayed = partsInTimeZone(new Date(instant), timeZone);
    const displayedAsUtc = Date.UTC(
      Number(displayed.year),
      Number(displayed.month) - 1,
      Number(displayed.day),
      Number(displayed.hour),
      Number(displayed.minute),
    );
    instant -= displayedAsUtc - target;
  }

  const result = new Date(instant);
  const roundTrip = partsInTimeZone(result, timeZone);
  const expected = {
    year: String(year).padStart(4, "0"),
    month: String(month).padStart(2, "0"),
    day: String(day).padStart(2, "0"),
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };

  return Object.entries(expected).every(([key, value]) => roundTrip[key] === value)
    ? result
    : undefined;
}

export function dateToLocalInput(date: Date, timeZone: string) {
  const parts = partsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const workshopFormSchema = z
  .object({
    title: z.string().trim().min(3, "Use at least 3 characters.").max(120),
    summary: z.string().trim().min(10, "Use at least 10 characters.").max(240),
    description: z.string().trim().min(30, "Use at least 30 characters.").max(5000),
    category: z.string().trim().min(2, "Enter a category.").max(60),
    startsAtLocal: z.string().regex(localDateTimePattern, "Enter a start date and time."),
    endsAtLocal: z.string().regex(localDateTimePattern, "Enter an end date and time."),
    timeZone: z.string().trim().refine(isTimeZone, "Enter a valid IANA time zone."),
    venue: z.string().trim().min(2, "Enter a venue.").max(120),
    address: z.string().trim().min(5, "Enter an address.").max(240),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").max(10_000),
    learningPointsText: z.string().trim().max(1500),
  })
  .superRefine((value, context) => {
    const startsAt = localDateTimeToDate(value.startsAtLocal, value.timeZone);
    const endsAt = localDateTimeToDate(value.endsAtLocal, value.timeZone);

    if (!startsAt) {
      context.addIssue({ code: "custom", path: ["startsAtLocal"], message: "This local time does not exist in that time zone." });
    }
    if (!endsAt) {
      context.addIssue({ code: "custom", path: ["endsAtLocal"], message: "This local time does not exist in that time zone." });
    }
    if (startsAt && endsAt && endsAt <= startsAt) {
      context.addIssue({ code: "custom", path: ["endsAtLocal"], message: "The end must be after the start." });
    }

    const learningPoints = value.learningPointsText
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean);
    if (learningPoints.length === 0) {
      context.addIssue({ code: "custom", path: ["learningPointsText"], message: "Add at least one learning point." });
    }
    if (learningPoints.length > 8) {
      context.addIssue({ code: "custom", path: ["learningPointsText"], message: "Use no more than 8 learning points." });
    }
    if (learningPoints.some((point) => point.length > 160)) {
      context.addIssue({ code: "custom", path: ["learningPointsText"], message: "Keep each learning point under 160 characters." });
    }
  });

export type WorkshopFormValues = z.infer<typeof workshopFormSchema>;
export type WorkshopFormField = keyof WorkshopFormValues;

export function parseWorkshopForm(formData: FormData) {
  const result = workshopFormSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    category: formData.get("category"),
    startsAtLocal: formData.get("startsAtLocal"),
    endsAtLocal: formData.get("endsAtLocal"),
    timeZone: formData.get("timeZone"),
    venue: formData.get("venue"),
    address: formData.get("address"),
    capacity: formData.get("capacity"),
    learningPointsText: formData.get("learningPointsText"),
  });

  if (!result.success) {
    const fieldErrors: Partial<Record<WorkshopFormField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as WorkshopFormField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { success: false as const, fieldErrors };
  }

  const startsAt = localDateTimeToDate(result.data.startsAtLocal, result.data.timeZone);
  const endsAt = localDateTimeToDate(result.data.endsAtLocal, result.data.timeZone);
  if (!startsAt || !endsAt) throw new Error("Validated workshop dates could not be converted.");

  return {
    success: true as const,
    data: {
      title: result.data.title,
      summary: result.data.summary,
      description: result.data.description,
      category: result.data.category,
      startsAt,
      endsAt,
      timeZone: result.data.timeZone,
      venue: result.data.venue,
      address: result.data.address,
      capacity: result.data.capacity,
      learningPoints: result.data.learningPointsText.split("\n").map((point) => point.trim()).filter(Boolean),
    },
  };
}

export function slugifyWorkshopTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "workshop";
}
