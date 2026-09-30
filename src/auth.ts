import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { googleCredentials } from "@/lib/db/schema";
import { encrypt, decrypt } from "@/lib/crypto";
export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async signIn({ profile, account }) {
      const owner = profile?.email?.toLowerCase();
      if (
        !process.env.ALLOWED_EMAIL ||
        owner !== process.env.ALLOWED_EMAIL.toLowerCase() ||
        !profile?.email_verified
      )
        return false;
      if (account?.access_token) {
        const [previous] = await db()
          .select()
          .from(googleCredentials)
          .where(eq(googleCredentials.owner, owner));
        const old = previous
          ? decrypt<GoogleTokens>(previous.encryptedTokens)
          : undefined;
        const tokens: GoogleTokens = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? old?.refreshToken,
          expiresAt: account.expires_at ?? 0,
          scope: account.scope ?? "",
        };
        await db()
          .insert(googleCredentials)
          .values({ owner, encryptedTokens: encrypt(tokens) })
          .onConflictDoUpdate({
            target: googleCredentials.owner,
            set: { encryptedTokens: encrypt(tokens), updatedAt: new Date() },
          });
      }
      return true;
    },
  },
});
