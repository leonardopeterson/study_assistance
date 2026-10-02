import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { api, AppError, checkOrigin, requireOwner } from "@/lib/server";
import { entryInput } from "@/lib/domain";
import { getEntry, toEntry } from "@/lib/repository";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";

type Context = { params: Promise<{ id: string }> };

const occurrenceInput = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Informe uma data válida"),
});

export async function POST(req: Request, ctx: Context) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const id = z
      .string()
      .uuid()
      .parse((await ctx.params).id);
    const { date } = occurrenceInput.parse(await req.json());
    const item = await getEntry(owner, id);
    if (item.recurrence !== "daily" || !item.recurrenceStartDate)
      throw new AppError("Este registro não é uma rotina diária");
    if (date < item.recurrenceStartDate)
      throw new AppError("Esta rotina ainda não tinha começado nesta data");

    const existingDates = item.completedDates ?? [];
    const completedDates = existingDates.includes(date)
      ? existingDates.filter((completedDate) => completedDate !== date)
      : [...existingDates, date].sort();
    const data = {
      ...entryInput.parse(item),
      completedDates,
    };
    const [row] = await db()
      .update(entries)
      .set({ data, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.owner, owner)))
      .returning();
    return toEntry(row);
  });
}
