import {
  pgSchema,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type { EntryInput } from "../domain";
export const assistance = pgSchema("assistance");
export const entries = assistance.table(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(),
    data: jsonb("data").$type<EntryInput>().notNull(),
    googleEventId: text("google_event_id"),
    googleEtag: text("google_etag"),
    calendarId: text("calendar_id"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    driveFileId: text("drive_file_id"),
    driveUrl: text("drive_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("entries_owner_idx").on(t.owner)],
);
export const googleCredentials = assistance.table("google_credentials", {
  owner: text("owner").primaryKey(),
  encryptedTokens: text("encrypted_tokens").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
