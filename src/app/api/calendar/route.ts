import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { api, AppError, checkOrigin, requireOwner } from "@/lib/server";
import { getEntry, listEntries, toEntry } from "@/lib/repository";
import { googleToken, googleRequest } from "@/lib/google";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { entryInput } from "@/lib/domain";
const input = z.object({
  id: z.string().uuid(),
  action: z.enum(["push", "pull", "unlink"]),
});
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const { id, action } = input.parse(await req.json());
    const item = await getEntry(owner, id);
    if (item.kind !== "event")
      throw new AppError("Somente compromissos podem ser sincronizados");
    const where = and(eq(entries.id, id), eq(entries.owner, owner));
    if (action === "unlink") {
      const [row] = await db()
        .update(entries)
        .set({
          googleEventId: null,
          googleEtag: null,
          calendarId: null,
          syncedAt: null,
        })
        .where(where)
        .returning();
      return toEntry(row);
    }
    const token = await googleToken(owner, "calendar");
    const calendar = item.calendarId ?? "primary";
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`;
    if (action === "push") {
      if (!item.startsAt || !item.endsAt)
        throw new AppError("Informe início e término");
      const googleId = item.googleEventId ?? item.id.replaceAll("-", "");
      let etag = item.googleEtag;
      // Deterministic event IDs make retrying an interrupted first sync safe.
      let exists = !!item.googleEventId;
      if (!exists) {
        try {
          const remote = await googleRequest(token, `${base}/${googleId}`);
          exists = true;
          etag = remote.etag;
        } catch (e) {
          if (!(e instanceof AppError) || e.status !== 404) throw e;
        }
      }
      const body = {
        ...(exists ? {} : { id: googleId }),
        summary: item.title,
        description: item.notes,
        start: { dateTime: item.startsAt },
        end: { dateTime: item.endsAt },
        status: item.status === "cancelled" ? "cancelled" : "confirmed",
        extendedProperties: { private: { assistanceId: item.id } },
      };
      const result = await googleRequest(
        token,
        exists ? `${base}/${googleId}` : base,
        {
          method: exists ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...(exists && etag ? { "If-Match": etag } : {}),
          },
          body: JSON.stringify(body),
        },
      );
      await db()
        .update(entries)
        .set({
          googleEventId: result.id,
          googleEtag: result.etag,
          calendarId: calendar,
          syncedAt: new Date(),
        })
        .where(where);
    } else {
      if (!item.googleEventId)
        throw new AppError("Sincronize o compromisso primeiro");
      let remote;
      try {
        remote = await googleRequest(token, `${base}/${item.googleEventId}`);
      } catch (error) {
        if (!(error instanceof AppError) || error.status !== 404) throw error;
        remote = { status: "cancelled", etag: item.googleEtag };
      }
      const data = entryInput.parse({
        ...item,
        title: remote.summary ?? item.title,
        notes: remote.description ?? item.notes,
        status:
          remote.status === "cancelled"
            ? "cancelled"
            : item.status === "cancelled"
              ? "pending"
              : item.status,
        startsAt:
          remote.start?.dateTime ??
          (remote.start?.date
            ? `${remote.start.date}T00:00:00-03:00`
            : item.startsAt),
        endsAt:
          remote.end?.dateTime ??
          (remote.end?.date
            ? `${remote.end.date}T00:00:00-03:00`
            : item.endsAt),
      });
      await db()
        .update(entries)
        .set({
          data,
          updatedAt: new Date(),
          googleEtag: remote.etag,
          syncedAt: new Date(),
        })
        .where(where);
    }
    return toEntry((await db().select().from(entries).where(where))[0]);
  });
}
export async function GET() {
  return api(async () =>
    (await listEntries(await requireOwner())).filter((e) => !!e.googleEventId),
  );
}
