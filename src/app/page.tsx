import { auth, signIn, signOut } from "@/auth";
import { configured } from "@/lib/server";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, BookOpen, CalendarDays, Sparkle } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!configured())
    return process.env.NODE_ENV === "development" ? (
      <Dashboard mode="preview" name="Leonardo" />
    ) : (
      <main className="setup-page">
        <h1>Assistance</h1>
        <p>
          A configuração inicial precisa ser concluída. Preencha as variáveis de
          ambiente para ativar o login Google.
        </p>
      </main>
    );
  const session = await auth();
  if (
    !session?.user?.email ||
    session.user.email.toLowerCase() !==
      process.env.ALLOWED_EMAIL?.toLowerCase()
  )
    return (
      <main className="login">
        <div className="login-art">
          <span className="brand">
            <Sparkle /> assistance<span className="brand-dot">.</span>
          </span>
          <h1>
            Seu dia,
            <br />
            com mais clareza.
          </h1>
          <p>
            Um lugar para cuidar da sua rotina,
            <br />
            dos seus estudos e do que vem depois.
          </p>
          <div className="login-tiles">
            <CalendarDays />
            <BookOpen />
          </div>
        </div>
        <div className="login-form">
          <span className="eyebrow">SEU ESPAÇO PESSOAL</span>
          <h2>Bem-vindo ao Assistance</h2>
          <p>Entre com a sua conta Google para continuar.</p>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button size="lg" type="submit">
              Entrar com Google <ArrowUpRight size={18} />
            </Button>
          </form>
          <small>Acesso exclusivo à conta autorizada.</small>
        </div>
      </main>
    );
  return (
    <Dashboard
      mode="connected"
      email={session.user.email}
      name={session.user.name?.split(" ")[0] ?? "Leonardo"}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
      connectAction={async () => {
        "use server";
        await signIn(
          "google",
          { redirectTo: "/" },
          {
            scope:
              "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file",
            access_type: "offline",
            prompt: "consent",
          },
        );
      }}
    />
  );
}
