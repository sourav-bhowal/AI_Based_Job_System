"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success) {
      // Force a hard navigation so layout.tsx refetches the User from cookies
      window.location.href = "/";
    }
  }, [state]);

  if (isAuthenticated) { router.push("/"); return null; }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-md)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Welcome back</h1>
          <p className="text-[var(--muted)]">Sign in to your JobShield account</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-md)]">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="animate-fade-in rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/20 p-3 text-sm text-[var(--danger)]">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Username or Email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50"
                placeholder="Enter username or email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
