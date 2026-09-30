import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { api, AppError, checkOrigin, requireOwner } from "@/lib/server";
import { entryInput } from "@/lib/domain";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { toEntry, validateSubject } from "@/lib/repository";
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const { id, data } = z
      .object({ id: z.string().uuid(), data: entryInput })
      .parse(await req.json());
    if (data.kind !== "session" || data.status !== "completed")
      throw new AppError("Sessão inválida");
    await validateSubject(owner, data);
    await db()
      .insert(entries)
      .values({ id, owner, data })
      .onConflictDoNothing();
    const [row] = await db()
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.owner, owner)));
    if (!row) throw new AppError("Sessão inválida", 409);
    return toEntry(row);
  });
}
