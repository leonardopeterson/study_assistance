import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { api, AppError, checkOrigin, requireOwner } from "@/lib/server";
import {
  getEntry,
  listEntries,
  toEntry,
  validateSubject,
} from "@/lib/repository";
import { entryInput } from "@/lib/domain";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { googleToken, googleRequest } from "@/lib/google";
type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, ctx: Context) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const id = z
      .string()
      .uuid()
      .parse((await ctx.params).id);
    const previous = await getEntry(owner, id);
    const data = entryInput.parse(await req.json());
    if (data.kind !== previous.kind)
      throw new AppError("O tipo do registro não pode mudar");
    if (data.subjectId === id) throw new AppError("Matéria inválida");
    await validateSubject(owner, data);
    const completedDates =
      data.recurrence === "daily" && previous.recurrence === "daily"
        ? (previous.completedDates ?? [])
        : [];
    const [row] = await db()
      .update(entries)
      .set({ data: { ...data, completedDates }, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.owner, owner)))
      .returning();
    return toEntry(row);
  });
}
export async function DELETE(req: Request, ctx: Context) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const id = z
      .string()
      .uuid()
      .parse((await ctx.params).id);
    const item = await getEntry(owner, id);
    const integration = new URL(req.url).searchParams.get("integration");
    if (integration !== null && !["delete", "keep"].includes(integration))
      throw new AppError("Escolha uma opção válida para a integração");
    if ((item.googleEventId || item.driveFileId) && integration === null)
      throw new AppError(
        "Escolha se deseja excluir também na integração ou preservar o item no Google.",
      );
    if (
      item.kind === "subject" &&
      (await listEntries(owner)).some((e) => e.subjectId === id)
    )
      throw new AppError("Remova os vínculos da matéria antes de excluí-la");
    if (integration === "delete" && item.googleEventId) {
      const token = await googleToken(owner, "calendar");
      try {
        await googleRequest(
          token,
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(item.calendarId ?? "primary")}/events/${encodeURIComponent(item.googleEventId)}`,
          {
            method: "DELETE",
            headers: item.googleEtag ? { "If-Match": item.googleEtag } : {},
          },
        );
      } catch (error) {
        if (!(error instanceof AppError && error.status === 404)) throw error;
      }
    }
    if (integration === "delete" && item.driveFileId) {
      const token = await googleToken(owner, "drive");
      try {
        await googleRequest(
          token,
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.driveFileId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trashed: true }),
          },
        );
      } catch (error) {
        if (!(error instanceof AppError && error.status === 404)) throw error;
      }
    }
    await db()
      .delete(entries)
      .where(and(eq(entries.id, id), eq(entries.owner, owner)));
    return { ok: true };
  });
}
