"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (result?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Link href="/" className="mb-10 font-mono text-sm font-medium tracking-tight text-ink">
        GUARDIAN
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mt-2 text-sm text-ink-secondary">Start investigating in under a minute.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-ink-secondary" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-info"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-card border border-canvas-border bg-canvas-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-info"
          />
          <p className="mt-1.5 text-xs text-ink-muted">At least 8 characters.</p>
        </div>

        {error && <p className="text-sm text-risk">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-card bg-trust px-4 py-2.5 text-sm font-medium text-canvas transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-ink hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
