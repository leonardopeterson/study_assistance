import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "./db";
import { entries } from "./db/schema";
import { AppError } from "./server";
import type { Entry, EntryInput } from "./domain";
export function toEntry(row: typeof entries.$inferSelect): Entry {
  return {
    ...row.data,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    googleEventId: row.googleEventId,
    googleEtag: row.googleEtag,
    calendarId: row.calendarId,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    driveFileId: row.driveFileId,
    driveUrl: row.driveUrl,
  };
}
export async function listEntries(owner: string) {
  return (
    await db()
      .select()
      .from(entries)
      .where(eq(entries.owner, owner))
      .orderBy(desc(entries.createdAt))
  ).map(toEntry);
}
export async function getEntry(owner: string, id: string) {
  const [row] = await db()
    .select()
    .from(entries)
    .where(and(eq(entries.owner, owner), eq(entries.id, id)));
  if (!row) throw new AppError("Registro não encontrado", 404);
  return toEntry(row);
}
export async function validateSubject(owner: string, data: EntryInput) {
  if (data.subjectId) {
    const subject = await getEntry(owner, data.subjectId);
    if (subject.kind !== "subject") throw new AppError("Matéria inválida");
  }
}
