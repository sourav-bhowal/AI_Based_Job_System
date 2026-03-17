"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck } from "lucide-react";
import { registerAction } from "@/lib/actions/auth";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/";
    }
  }, [state]);

  if (isAuthenticated) { router.push("/"); return null; }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-[var(--shadow-md)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Create account</h1>
          <p className="text-[var(--muted)]">Get started with JobShield AI</p>
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
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Full Name <span className="text-[var(--muted)]">(optional)</span>
              </label>
              <input id="fullName" name="full_name" type="text"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50" placeholder="John Doe" />
            </div>

            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Username</label>
              <input id="username" name="username" type="text" required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50" placeholder="johndoe" />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Email</label>
              <input id="email" name="email" type="email" required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50" placeholder="john@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Password</label>
              <input id="password" name="password" type="password" required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50" placeholder="Create a password" />
            </div>

            <button type="submit" disabled={isPending}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
              {isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
