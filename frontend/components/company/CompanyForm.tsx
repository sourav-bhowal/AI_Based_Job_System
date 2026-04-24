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

  const formSection = (
    <Card animate className={`mb-8 ${!result ? 'border-t-4 border-t-[var(--accent)]' : ''}`}>
      {!result && <h2 className="text-xl font-bold text-[var(--foreground)] mb-5">Scan a Company</h2>}
      {result && <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] mb-4">New Search</h2>}
      <form action={clientAction} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Company Name</label>
          <div className="relative">
            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <input name="company_name" required placeholder="e.g. Acme Corporation"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] pl-10 pr-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
          </div>
        </div>
        <div className={`grid grid-cols-1 ${!result ? 'md:grid-cols-2' : ''} gap-4`}>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Domain <span className="font-normal lowercase opacity-70">(optional)</span></label>
            <input name="domain" placeholder="company.com"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Contact Email <span className="font-normal lowercase opacity-70">(optional)</span></label>
            <input name="email" type="email" placeholder="hr@company.com"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
          </div>
        </div>
        <button type="submit" disabled={isPending}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
          {isPending ? "Checking Database..." : <><Search className="h-4 w-4" /> Check Reputation</>}
        </button>
      </form>
    </Card>
  );

  if (!result) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        {formSection}
        {isPending && <LoadingSpinner message="Scanning registry and analyzing company data..." />}
        {error && <div className="mt-6"><ErrorDisplay message={error} onRetry={() => setError(null)} /></div>}
      </div>
    );
  }

  const blacklistWarning = result.community_data?.is_blacklisted ? (
    <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-5 flex flex-col sm:flex-row items-center gap-4 text-[var(--danger)] shadow-sm">
      <AlertTriangle className="h-10 w-10 shrink-0" />
      <div>
        <h3 className="font-bold text-lg tracking-tight">CRITICAL WARNING: COMPANY BLACKLISTED</h3>
        <p className="text-sm font-medium mt-1">This company has been reported {result.community_data.report_count} times by the community and is flagged as a high-risk scam.</p>
      </div>
    </div>
  ) : null;

  const trustScoreSidebar = (
    <Card className="relative overflow-hidden flex flex-col gap-5">
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: trustColor(result.trust_score) }} />
      
      {searchedValues && (
        <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm w-full">
           <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Entity Scanned</p>
           <p className="text-lg text-[var(--foreground)] font-bold tracking-tight flex items-center gap-2">
             <Building className="h-4 w-4 text-[var(--accent)] shrink-0" /> 
             <span className="truncate">{searchedValues.name}</span>
           </p>
           {searchedValues.domain && (
             <p className="text-xs font-medium text-[var(--muted)] flex items-center gap-1.5 mt-2 border-t border-[var(--card-border)] pt-2 w-full">
               <Globe className="h-3.5 w-3.5 shrink-0" /> 
               <span className="truncate">{searchedValues.domain}</span>
             </p>
           )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Assessed Trust</p>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {result.trust_level}
          </h2>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border-4 shadow-sm shrink-0" style={{ borderColor: trustColor(result.trust_score) }}>
          <span className="text-xl font-extrabold tracking-tighter" style={{ color: trustColor(result.trust_score) }}>{result.trust_score}</span>
        </div>
      </div>
    </Card>
  );

  const metricsBreakdown = (
    <Card>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">Metric Breakdown</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(result.details).map(([key, val]) => (
          <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">{key.replace(/_/g, " ").trim()}</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--card-border)]/50 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${val.score}%`, backgroundColor: trustColor(val.score) }} />
              </div>
              <span className="text-xs font-extrabold w-6 text-right" style={{ color: trustColor(val.score) }}>{val.score}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const detailedFindings = result.details && (
    <Card>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
        Detailed Findings
      </h3>
      <ul className="space-y-2">
        {[
          ...(result.details.domain?.reasons || []).map(msg => ({ msg, source: "Domain" })),
          ...(result.details.email?.reason ? [{ msg: result.details.email.reason, source: "Email" }] : []),
          ...(result.details.name?.signals || []).map(msg => ({ msg, source: "Name" })),
          ...(result.details.community?.reasons || []).map(msg => ({ msg, source: "Community" }))
        ].map((item, i) => (
          <li key={i} className="text-sm font-medium flex items-start gap-3 p-3.5 rounded-xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] shadow-sm">
            <span className="mt-0.5 text-[var(--accent)]">•</span> 
            <span>
              <strong className="text-[var(--accent)] mr-2 uppercase tracking-wide text-[10px]">{item.source}</strong> 
              {item.msg}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in-up">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-8 space-y-6">
        {blacklistWarning}
        {metricsBreakdown}
        {detailedFindings}
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-4 space-y-6">
        {trustScoreSidebar}
        {formSection}
        {isPending && <LoadingSpinner message="Scanning..." />}
        {error && <ErrorDisplay message={error} onRetry={() => setError(null)} />}
      </div>
    </div>
  );
}
