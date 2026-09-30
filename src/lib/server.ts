import "server-only";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function configured() {
  return [
    "DATABASE_URL",
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "ALLOWED_EMAIL",
  ].every((key) => !!process.env[key]);
}
export async function requireOwner() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== process.env.ALLOWED_EMAIL?.toLowerCase())
    throw new AppError("Entre com sua conta Google", 401);
  return email;
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) throw new AppError("Origem inválida", 403);
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new AppError("Origem inválida", 403);
  }
  const host = req.headers.get("host") ?? new URL(req.url).host;
  if (parsed.host !== host || !["https:", "http:"].includes(parsed.protocol))
    throw new AppError("Origem inválida", 403);
}
export async function api(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(". ") },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "Assistance: falha na operação",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        error:
          "Não foi possível concluir. Verifique a conexão e tente novamente.",
      },
      { status: 500 },
    );
  }
}
