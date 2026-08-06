"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Link href="/" className="mb-10 font-mono text-sm font-medium tracking-tight text-ink">
        GUARDIAN
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Log in</h1>
      <p className="mt-2 text-sm text-ink-secondary">Pick up where your last investigation left off.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-ink-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-info"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-ink-secondary" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-info"
          />
        </div>

        {error && <p className="text-sm text-risk">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-card bg-trust px-4 py-2.5 text-sm font-medium text-canvas transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="mt-3 w-full rounded-card border border-canvas-border px-4 py-2.5 text-sm text-ink hover:border-ink-muted"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        No account?{" "}
        <Link href="/register" className="text-ink hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
