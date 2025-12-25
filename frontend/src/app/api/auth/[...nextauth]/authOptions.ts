import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

export const authOptions: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials, req) {
        try {
          const message = credentials?.message;
          const signature = credentials?.signature;
          if (!message || !signature) return null;

          const siwe = new SiweMessage(message);

          const host =
            req?.headers?.get("x-forwarded-host") ??
            req?.headers?.get("host") ??
            "";

          const result = await siwe.verify({
            signature,
            domain: host,
          });

          if (!result.success) return null;

          return { id: siwe.address.toLowerCase() };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      (session.user as any) = session.user ?? {};
      (session.user as any).address = token.sub;
      return session;
    },
  },
};