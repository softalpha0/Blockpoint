import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in frontend env`);
  return v;
}

export const authOptions: NextAuthOptions = {
  secret: mustEnv("NEXTAUTH_SECRET"),

  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
    error: "/login",
  },

  providers: [
    EmailProvider({
      from: mustEnv("EMAIL_FROM"),
      async sendVerificationRequest({ identifier, url, provider }) {
        const resend = new Resend(mustEnv("RESEND_API_KEY"));
        const { host } = new URL(url);

        await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: `Sign in to ${host}`,
          html: `
            <div style="font-family:system-ui,Segoe UI,Roboto,Arial;line-height:1.5">
              <h2>Blockpoint Sign-in</h2>
              <p>Click the button to sign in:</p>
              <p style="margin:24px 0">
                <a href="${url}" style="background:#111;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;display:inline-block">
                  Sign in
                </a>
              </p>
              <p style="color:#666;font-size:12px">If you didn’t request this, ignore this email.</p>
            </div>
          `,
          text: `Sign in: ${url}`,
        });
      },
    }),
  ],
};