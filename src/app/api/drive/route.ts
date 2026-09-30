import { z } from "zod";
import { api, AppError, checkOrigin, requireOwner } from "@/lib/server";
import { googleToken, googleRequest } from "@/lib/google";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { entryInput } from "@/lib/domain";
import { toEntry, validateSubject } from "@/lib/repository";
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    const owner = await requireOwner();
    const token = await googleToken(owner, "drive");
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "");
    const data = entryInput.parse({
      kind: "material",
      title,
      subjectId: form.get("subjectId") || null,
      notes: String(form.get("notes") ?? ""),
    });
    await validateSubject(owner, data);
    let remote;
    if (file instanceof File && file.size) {
      if (file.size > 3 * 1024 * 1024)
        throw new AppError(
          "Limite de upload: 3 MB. Para arquivos maiores, use um vínculo do Drive.",
        );
      const boundary = `assistance_${crypto.randomUUID()}`;
      const metadata = JSON.stringify({
        name: title || file.name,
        appProperties: { assistance: "true" },
      });
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
      ]);
      remote = await googleRequest(
        token,
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
    } else {
      const fileId = z
        .string()
        .regex(/^[\w-]{10,}$/)
        .parse(form.get("fileId"));
      remote = await googleRequest(
        token,
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink`,
      );
    }
    const [row] = await db()
      .insert(entries)
      .values({
        owner,
        data,
        driveFileId: remote.id,
        driveUrl:
          remote.webViewLink ??
          `https://drive.google.com/file/d/${remote.id}/view`,
      })
      .returning();
    return toEntry(row);
  });
}
