"use client";

import { useState, useTransition } from "react";
import { checkCompanyAction } from "@/lib/actions/company";
import type { CompanyCheckResult } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import Card from "@/components/Card";
import { ShieldCheck, Globe, AlertTriangle, Building, Search } from "lucide-react";

export default function CompanyForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanyCheckResult | null>(null);

  async function clientAction(formData: FormData) {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const actionRes = await checkCompanyAction(null, formData);
      if (!actionRes) return;
        
      if (actionRes.success) {
        setResult(actionRes.data);
      } else {
        setError(actionRes.error);
      }
    });
  }

  const trustColor = (score: number) =>
    score >= 70 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <>
      <Card animate className="mb-8 border-t-4 border-t-[var(--accent)]">
        <form action={clientAction} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Company Name</label>
            <div className="relative">
              <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted)]" />
              <input name="company_name" required placeholder="e.g. Acme Corporation"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] pl-11 pr-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Domain <span className="text-[var(--muted)] font-normal">(optional)</span></label>
              <input name="domain" placeholder="company.com"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Contact Email <span className="text-[var(--muted)] font-normal">(optional)</span></label>
              <input name="email" type="email" placeholder="hr@company.com"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
            </div>
          </div>
          <button type="submit" disabled={isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
            {isPending ? "Checking Database..." : <><Search className="h-4 w-4" /> Check Reputation</>}
          </button>
        </form>
      </Card>

      {isPending && <LoadingSpinner message="Scanning registry and analyzing company data..." />}
      {error && <div className="mt-6"><ErrorDisplay message={error} onRetry={() => setError(null)} /></div>}

      {result && (
        <div className="mt-8 space-y-6 animate-fade-in-up">
          <Card padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] mb-1">Assessed Trust Level</p>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {result.trust_level}
                  {result.trust_score >= 70 ? (
                    <ShieldCheck className="h-6 w-6 text-[var(--success)]" />
                  ) : result.trust_score >= 50 ? (
                    <AlertTriangle className="h-6 w-6 text-[var(--warning)]" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
                  )}
                </h2>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 shadow-sm" style={{ borderColor: trustColor(result.trust_score) }}>
                <span className="text-3xl font-extrabold tracking-tighter" style={{ color: trustColor(result.trust_score) }}>{result.trust_score}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-5 text-lg font-bold text-[var(--foreground)]">Metric Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(result.breakdown).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{key.replace(/_/g, " ").replace(/score/g, "").trim()}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-[var(--card-border)]/50 overflow-hidden">
                      <div className="h-2.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${val}%`, backgroundColor: trustColor(val) }} />
                    </div>
                    <span className="text-sm font-bold w-6 text-right" style={{ color: trustColor(val) }}>{val}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {result.domain_info && (
            <Card>
              <h3 className="mb-4 text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <Globe className="h-4 w-4" />
                </div>
                Domain Diagnostics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">Age</div>
                  <div className="text-lg font-bold text-[var(--foreground)]">{result.domain_info.age_years ? `${result.domain_info.age_years} Years` : "Unknown"}</div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">Registrar</div>
                  <div className="text-sm font-bold text-[var(--foreground)] truncate px-2">{result.domain_info.registrar || "—"}</div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">Registered</div>
                  <div className="text-sm font-bold text-[var(--foreground)]">{result.domain_info.creation_date || "—"}</div>
                </div>
              </div>
            </Card>
          )}

          {result.warnings.length > 0 && (
            <Card variant="warning" className="border-[var(--warning)]/30">
              <h3 className="mb-3 text-lg font-bold text-[var(--warning)] flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Active Warnings
              </h3>
              <ul className="space-y-2">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm font-medium text-[var(--warning)]/90 flex items-start gap-2 bg-[var(--background)] p-3 rounded-lg border border-[var(--warning)]/10">
                    <span className="text-[var(--warning)] mt-0.5">•</span> {w}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
