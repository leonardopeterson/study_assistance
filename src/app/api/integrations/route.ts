import { eq } from "drizzle-orm";
import { api, requireOwner } from "@/lib/server";
import { db } from "@/lib/db";
import { googleCredentials } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import type { GoogleTokens } from "@/auth";
export async function GET() {
  return api(async () => {
    const owner = await requireOwner();
    const [row] = await db()
      .select()
      .from(googleCredentials)
      .where(eq(googleCredentials.owner, owner));
    const scope = row ? decrypt<GoogleTokens>(row.encryptedTokens).scope : "";
    return {
      calendar: scope.includes("calendar.events"),
      drive: scope.includes("drive.file"),
    };
  });
}
