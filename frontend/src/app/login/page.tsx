"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 20 }}>
      <h1>Sign in</h1>
      <p>Enter your email to receive a magic link.</p>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
      />

      <button
        onClick={() => signIn("email", { email, callbackUrl: "/dashboard" })}
        style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #111" }}
      >
        Send magic link
      </button>
    </div>
  );
}