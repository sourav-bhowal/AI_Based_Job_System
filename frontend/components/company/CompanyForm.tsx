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
  const [searchedValues, setSearchedValues] = useState<{ name: string; domain?: string } | null>(null);

  async function clientAction(formData: FormData) {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const actionRes = await checkCompanyAction(null, formData);
      if (!actionRes) return;
        
      if (actionRes.success) {
        setResult(actionRes.data);
        setSearchedValues({
          name: formData.get("company_name") as string,
          domain: (formData.get("domain") as string) || undefined
        });
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
          {result.community_data?.is_blacklisted && (
            <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-5 flex flex-col sm:flex-row items-center gap-4 text-[var(--danger)] shadow-sm">
              <AlertTriangle className="h-10 w-10 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">CRITICAL WARNING: COMPANY BLACKLISTED</h3>
                <p className="text-sm opacity-90 font-medium">This company has been reported {result.community_data.report_count} times by the community and is flagged as a high-risk scam.</p>
              </div>
            </div>
          )}

          <Card padding="lg" className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: trustColor(result.trust_score) }} />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
              
              <div className="flex-1">
                {searchedValues && (
                  <div className="mb-4 bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 inline-block shadow-sm pr-12">
                     <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Entity Scanned</p>
                     <p className="text-xl text-[var(--foreground)] font-extrabold tracking-tight flex items-center gap-2">
                       <Building className="h-5 w-5 text-[var(--accent)]" /> 
                       {searchedValues.name}
                     </p>
                     {searchedValues.domain && (
                       <p className="text-sm font-medium text-[var(--muted)] flex items-center gap-1.5 mt-1 border-t border-[var(--card-border)] pt-1 w-fit">
                         <Globe className="h-3.5 w-3.5" /> 
                         {searchedValues.domain}
                       </p>
                     )}
                  </div>
                )}
              
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
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 shadow-sm shrink-0" style={{ borderColor: trustColor(result.trust_score) }}>
                <span className="text-3xl font-extrabold tracking-tighter" style={{ color: trustColor(result.trust_score) }}>{result.trust_score}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-5 text-lg font-bold text-[var(--foreground)]">Metric Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(result.details).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{key.replace(/_/g, " ").trim()}</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 rounded-full bg-[var(--card-border)]/50 overflow-hidden">
                      <div className="h-2.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${val.score}%`, backgroundColor: trustColor(val.score) }} />
                    </div>
                    <span className="text-sm font-bold w-6 text-right" style={{ color: trustColor(val.score) }}>{val.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {result.details && (
            <Card>
              <h3 className="mb-4 text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <Globe className="h-4 w-4" />
                </div>
                Detailed Findings
              </h3>
              <ul className="space-y-2">
                {[
                  ...(result.details.domain?.reasons || []).map(msg => ({ msg, source: "Domain" })),
                  ...(result.details.email?.reason ? [{ msg: result.details.email.reason, source: "Email" }] : []),
                  ...(result.details.name?.signals || []).map(msg => ({ msg, source: "Name" })),
                  ...(result.details.community?.reasons || []).map(msg => ({ msg, source: "Community" }))
                ].map((item, i) => (
                  <li key={i} className="text-sm font-medium flex items-start gap-2 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)]">
                    <span className="mt-0.5 text-[var(--accent)]">●</span> 
                    <span>
                      <strong className="text-[var(--accent)] mr-1">{item.source}:</strong> 
                      {item.msg}
                    </span>
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
