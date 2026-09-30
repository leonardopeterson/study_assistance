import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { googleCredentials } from "./db/schema";
import { encrypt, decrypt } from "./crypto";
import { AppError } from "./server";
import type { GoogleTokens } from "@/auth";
export async function googleToken(owner: string, scope: "calendar" | "drive") {
  const [row] = await db()
    .select()
    .from(googleCredentials)
    .where(eq(googleCredentials.owner, owner));
  if (!row) throw new AppError("Conecte sua conta Google", 401);
  let tokens = decrypt<GoogleTokens>(row.encryptedTokens);
  const required =
    scope === "calendar"
      ? "https://www.googleapis.com/auth/calendar.events"
      : "https://www.googleapis.com/auth/drive.file";
  if (!tokens.scope.split(" ").includes(required))
    throw new AppError("Autorize Calendar e Drive em Integrações", 403);
  if (tokens.expiresAt * 1000 < Date.now() + 60000) {
    if (!tokens.refreshToken)
      throw new AppError("Reconecte sua conta Google", 401);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });
    if (!res.ok)
      throw new AppError(
        "A autorização Google expirou. Reconecte sua conta.",
        401,
      );
    const next = await res.json();
    tokens = {
      ...tokens,
      accessToken: next.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + next.expires_in,
      refreshToken: next.refresh_token ?? tokens.refreshToken,
    };
    await db()
      .update(googleCredentials)
      .set({ encryptedTokens: encrypt(tokens), updatedAt: new Date() })
      .where(eq(googleCredentials.owner, owner));
  }
  return tokens.accessToken;
}
export async function googleRequest(
  token: string,
  url: string,
  init: RequestInit = {},
) {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 412)
    throw new AppError(
      "Este evento mudou no Google. Importe a alteração antes de enviar novamente.",
      409,
    );
  if (!res.ok)
    throw new AppError(
      res.status === 404 || res.status === 410
        ? "Arquivo ou evento não encontrado no Google"
        : "Google recusou a operação. Verifique as permissões e tente novamente.",
      res.status === 404 || res.status === 410 ? 404 : 502,
    );
  return res.status === 204 ? null : res.json();
}
