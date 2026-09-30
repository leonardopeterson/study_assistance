CREATE SCHEMA "assistance";
--> statement-breakpoint
CREATE TABLE "assistance"."entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" text NOT NULL,
	"data" jsonb NOT NULL,
	"google_event_id" text,
	"google_etag" text,
	"calendar_id" text,
	"synced_at" timestamp with time zone,
	"drive_file_id" text,
	"drive_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistance"."google_credentials" (
	"owner" text PRIMARY KEY NOT NULL,
	"encrypted_tokens" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "entries_owner_idx" ON "assistance"."entries" USING btree ("owner");