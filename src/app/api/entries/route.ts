import { api, checkOrigin, requireOwner } from "@/lib/server";
import { listEntries, toEntry, validateSubject } from "@/lib/repository";
import { entryInput } from "@/lib/domain";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
export async function GET() {
  return api(async () => listEntries(await requireOwner()));
}
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const data = entryInput.parse(await req.json());
    await validateSubject(owner, data);
    const [row] = await db()
      .insert(entries)
      .values({ owner, data: { ...data, completedDates: [] } })
      .returning();
    return toEntry(row);
  });
}
