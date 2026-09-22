import { sql } from "drizzle-orm";
import { user } from "./auth-schema";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workshopStatus = pgEnum("workshop_status", [
  "draft",
  "published",
  "canceled",
]);

export const registrationStatus = pgEnum("registration_status", [
  "confirmed",
  "waitlisted",
  "canceled",
]);

export const organizers = pgTable("organizers", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: text("auth_user_id")
    .unique()
    .references(() => user.id),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workshops = pgTable(
  "workshops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timeZone: text("time_zone").notNull(),
    venue: text("venue").notNull(),
    address: text("address").notNull(),
    capacity: integer("capacity").notNull(),
    learningPoints: text("learning_points").array().notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    status: workshopStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workshops_status_starts_at_idx").on(table.status, table.startsAt),
    check("workshops_capacity_positive", sql`${table.capacity} > 0`),
    check("workshops_end_after_start", sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workshopId: uuid("workshop_id")
      .notNull()
      .references(() => workshops.id),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    cancellationTokenHash: text("cancellation_token_hash").unique(),
    status: registrationStatus("status").notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  },
  (table) => [
    index("registrations_waitlist_idx").on(
      table.workshopId,
      table.status,
      table.registeredAt,
    ),
    uniqueIndex("registrations_active_email_unique")
      .on(table.workshopId, table.attendeeEmail)
      .where(sql`${table.status} <> 'canceled'`),
  ],
);
