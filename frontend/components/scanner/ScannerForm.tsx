"use client";

import { useState, useTransition } from "react";
import { scanUrlAction, scanTextAction } from "@/lib/actions/scanner";
import type { ScanResult } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RiskBadge from "@/components/RiskBadge";
import Card from "@/components/Card";
import { Link as LinkIcon, FileText, BrainCircuit, Flag, AlertTriangle, CheckCircle2, IndianRupee } from "lucide-react";

type Tab = "url" | "text";

export default function ScannerForm() {
  const [activeTab, setActiveTab] = useState<Tab>("url");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function clientAction(formData: FormData) {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const actionRes = activeTab === "url" 
        ? await scanUrlAction(null, formData)
        : await scanTextAction(null, formData);
        
      if (!actionRes) return;
        
      if (actionRes.success) {
        setResult(actionRes.data);
      } else {
        setError(actionRes.error);
      }
    });
  }

  return (
    <>
      <div className="mb-6 flex gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-sm)]">
        {(["url", "text"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setActiveTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === t
                ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]/50"
            }`}>
            {t === "url" ? <><LinkIcon className="h-4 w-4" /> Scan URL</> : <><FileText className="h-4 w-4" /> Analyze Text</>}
          </button>
        ))}
      </div>

      <Card animate className="mb-6">
        <form action={clientAction} className="space-y-4">
          {activeTab === "url" ? (
            <div>
              <label htmlFor="scan-url" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Posting URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input id="scan-url" name="scan-url" type="url" required
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] pl-11 pr-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="https://example.com/job/123" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="scan-text" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Posting Text</label>
                <textarea id="scan-text" name="scan-text" required rows={6}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="Paste the full job posting text here..." />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="job-title" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Title <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input id="job-title" name="job-title" type="text"
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20" placeholder="Software Engineer" />
                </div>
                <div>
                  <label htmlFor="company-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Company <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input id="company-name" name="company-name" type="text"
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20" placeholder="Acme Corp" />
                </div>
              </div>
            </>
          )}
          <button type="submit" disabled={isPending}
            className="w-full sm:w-auto rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
            {isPending ? "Scanning..." : "Scan Posting"}
          </button>
        </form>
      </Card>

      {isPending && <LoadingSpinner message="Analyzing job posting for fraud indicators..." />}
      {error && <div className="mt-6"><ErrorDisplay message={error} onRetry={() => setError(null)} /></div>}

      {result && (
        <div className="mt-8 space-y-6 animate-fade-in-up">
          <Card variant={result.risk_level === "Safe" ? "success" : result.risk_level === "High Risk" ? "danger" : "warning"} padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">Risk Assessment</p>
                <h2 className="text-3xl font-bold">Overall Risk Score</h2>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-5xl font-extrabold mb-2 tracking-tighter">{result.risk_score.toFixed(1)}</div>
                <RiskBadge level={result.risk_level} size="lg" />
              </div>
            </div>
          </Card>

          {result.explanation && (
            <Card>
              <h3 className="mb-5 text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                Explainable AI Analysis
              </h3>
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4">
                <span className="text-sm font-medium text-[var(--muted)]">Model Prediction:</span>
                <span className={`text-base font-bold ${result.explanation.prediction === "scam" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                  {result.explanation.prediction.toUpperCase()}
                </span>
                <span className="text-sm text-[var(--muted)] ml-auto">
                  {typeof result.explanation.scam_probability === "number" ? result.explanation.scam_probability.toFixed(1) : result.explanation.scam_probability}% scam probability
                </span>
              </div>

              {result.explanation.red_flags?.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5 uppercase tracking-wide">
                    <Flag className="h-4 w-4 text-[var(--danger)]" /> Detected Red Flags
                  </h4>
                  <div className="space-y-2">
                    {result.explanation.red_flags.map((flag, i) => (
                      <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                        flag.severity === "critical" ? "border-[var(--danger)]/30 bg-[var(--danger-subtle)] text-[var(--danger)]"
                        : flag.severity === "high" ? "border-[var(--warning)]/30 bg-[var(--warning-subtle)] text-[var(--warning)]"
                        : "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)]"
                      }`}>
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block mb-0.5">{flag.flag}</span>
                          {flag.message && <span className="opacity-80">{flag.message}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const scamInd = result.explanation.top_scam_indicators || result.explanation.top_scam_features;
                const legitInd = result.explanation.top_legit_indicators || result.explanation.top_legit_features;
                return (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {scamInd && scamInd.length > 0 && (
                      <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-subtle)]/50 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--danger)] flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Scam Indicators
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {scamInd.slice(0, 10).map((f, i) => (
                            <span key={i} className="rounded-lg bg-[var(--background)] border border-[var(--danger)]/20 px-2.5 py-1 text-xs font-medium text-[var(--danger)] shadow-sm">{f.word}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {legitInd && legitInd.length > 0 && (
                      <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-subtle)]/50 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-[var(--success)] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Legitimacy Indicators
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {legitInd.slice(0, 10).map((f, i) => (
                            <span key={i} className="rounded-lg bg-[var(--background)] border border-[var(--success)]/20 px-2.5 py-1 text-xs font-medium text-[var(--success)] shadow-sm">{f.word}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          )}

          {result.salary_analysis && (
            <Card>
              <h3 className="mb-4 text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--warning-subtle)] text-[var(--warning)]">
                  <IndianRupee className="h-5 w-5" />
                </div>
                Salary Analysis
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">Anomaly Score</div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{(result.salary_analysis.anomaly_score * 100).toFixed(0)}%</div>
                </div>
                {result.salary_analysis.salary_provided && (
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">Salary Found</div>
                    <div className="text-sm font-medium text-[var(--foreground)] mt-2">{result.salary_analysis.salary_provided}</div>
                  </div>
                )}
                {result.salary_analysis.ml_prediction && (
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 text-center">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-1">ML Predicted</div>
                    <div className="text-lg font-bold text-[var(--accent)] mt-1">₹{result.salary_analysis.ml_prediction.predicted_salary.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
