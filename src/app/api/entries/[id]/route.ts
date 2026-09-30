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
    const [row] = await db()
      .update(entries)
      .set({ data, updatedAt: new Date() })
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
    if (item.googleEventId)
      throw new AppError(
        "Desvincule o Calendar antes de excluir. O evento no Google será preservado.",
      );
    if (
      item.kind === "subject" &&
      (await listEntries(owner)).some((e) => e.subjectId === id)
    )
      throw new AppError("Remova os vínculos da matéria antes de excluí-la");
    await db()
      .delete(entries)
      .where(and(eq(entries.id, id), eq(entries.owner, owner)));
    return { ok: true };
  });
}
