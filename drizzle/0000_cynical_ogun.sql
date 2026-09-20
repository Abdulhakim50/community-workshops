CREATE TYPE "public"."registration_status" AS ENUM('confirmed', 'waitlisted', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."workshop_status" AS ENUM('draft', 'published', 'canceled');--> statement-breakpoint
CREATE TABLE "organizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizers_contact_email_unique" UNIQUE("contact_email")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"attendee_name" text NOT NULL,
	"attendee_email" text NOT NULL,
	"status" "registration_status" NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"canceled_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"venue" text NOT NULL,
	"address" text NOT NULL,
	"capacity" integer NOT NULL,
	"learning_points" text[] NOT NULL,
	"status" "workshop_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workshops_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workshops_capacity_positive" CHECK ("workshops"."capacity" > 0),
	CONSTRAINT "workshops_end_after_start" CHECK ("workshops"."ends_at" > "workshops"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registrations_waitlist_idx" ON "registrations" USING btree ("workshop_id","status","registered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_active_email_unique" ON "registrations" USING btree ("workshop_id","attendee_email") WHERE "registrations"."status" <> 'canceled';--> statement-breakpoint
CREATE INDEX "workshops_status_starts_at_idx" ON "workshops" USING btree ("status","starts_at");