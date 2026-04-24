"use client";

import { useActionState, useState, useTransition } from "react";
import { scanUrlAction, scanTextAction, downloadScanPdfAction } from "@/lib/actions/scanner";
import type { ScanResult } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import RiskBadge from "@/components/RiskBadge";
import Card from "@/components/Card";
import { Link as LinkIcon, FileText, BrainCircuit, Flag, AlertTriangle, CheckCircle2, IndianRupee, FileDown, Building2, MapPin, Globe, Shield, Users, Info } from "lucide-react";

function formatToLPA(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} LPA`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString()}`;
}

type Tab = "url" | "text";

export default function ScannerForm() {
  const [activeTab, setActiveTab] = useState<Tab>("url");
  const [isPending, startTransition] = useTransition();
  const [isDownloadingPdf, startPdfDownload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);

  const handleDownloadPdf = async (url: string) => {
    startPdfDownload(async () => {
      const res = await downloadScanPdfAction(url);
      if (res.success && res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        alert(res.error || "Failed to download PDF.");
      }
    });
  };

  async function clientAction(formData: FormData) {
    setError(null);
    setResult(null);
    setScannedUrl(null);
    
    const url = formData.get("scan-url") as string;

    startTransition(async () => {
      const actionRes = activeTab === "url" 
        ? await scanUrlAction(null, formData)
        : await scanTextAction(null, formData);
        
      if (!actionRes) return;
        
      if (actionRes.success) {
        setResult(actionRes.data);
        if (activeTab === "url" && url) setScannedUrl(url);
      } else {
        if (actionRes.error === "SCRAPE_FAILED") {
          setError("Unable to automatically fetch the job posting due to site protections. Please paste the job description below to continue the analysis.");
          setActiveTab("text");
        } else if (actionRes.error === "SCRAPE_BLOCKED") {
          setError("Unable to fetch job details — site blocked automated access. Please paste the job description manually.");
          setActiveTab("text");
        } else {
          setError(actionRes.error);
        }
      }
    });
  }

  const formSection = (
    <>
      <div className="mb-4 flex gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1">
        {(["url", "text"] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setActiveTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === t
                ? "bg-[var(--accent)] text-white"
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
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input id="scan-url" name="scan-url" type="url" required
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="https://example.com/job/123" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="scan-text" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Posting Text</label>
                <textarea id="scan-text" name="scan-text" required rows={5}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="Paste the full job posting text here..." />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="job-title" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Title <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input id="job-title" name="job-title" type="text"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20" placeholder="Software Engineer" />
                </div>
                <div>
                  <label htmlFor="company-name" className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Company <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input id="company-name" name="company-name" type="text"
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 hover:border-[var(--muted)]/50 focus:ring-2 focus:ring-[var(--accent)]/20" placeholder="Acme Corp" />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-start">
            <button type="submit" disabled={isPending}
              className="w-full sm:w-auto rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--accent-light)] disabled:opacity-50">
              {isPending ? "Scanning..." : "Scan Posting"}
            </button>
          </div>
        </form>
      </Card>

      {isPending && <LoadingSpinner message="Analyzing job posting for fraud indicators..." />}
      {error && <div className="mt-4"><ErrorDisplay message={error} onRetry={() => setError(null)} /></div>}
    </>
  );

  if (!result) {
    return <div className="w-full">{formSection}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in-up">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-2 space-y-6">
        {formSection}

        {result.explanation && (
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                <BrainCircuit className="h-4 w-4" />
              </div>
              Explainable AI Analysis
            </h3>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
              <span className="text-sm font-medium text-[var(--muted)]">Model Prediction:</span>
              <span className={`text-sm font-bold ${result.explanation.prediction === "scam" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                {result.explanation.prediction.toUpperCase()}
              </span>
              <span className="text-sm text-[var(--muted)] sm:ml-auto">
                {typeof result.explanation.scam_probability === "number" ? result.explanation.scam_probability.toFixed(1) : result.explanation.scam_probability}% scam probability
              </span>
            </div>

            {result.explanation.ai_detection && (
              <div className="mb-5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">AI Detection Analysis</h4>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded text-[10px] font-bold px-2 py-0.5 ${
                    result.explanation.ai_detection.verdict === "likely_ai"
                      ? "bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning)]/20"
                      : result.explanation.ai_detection.verdict === "likely_human"
                      ? "bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/20"
                      : "bg-[var(--muted)]/20 text-[var(--muted)] border border-[var(--card-border)]"
                  }`}>
                    {result.explanation.ai_detection.verdict === "likely_ai" ? "AI-Generated" : result.explanation.ai_detection.verdict === "likely_human" ? "Human-Written" : "Uncertain"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {(result.explanation.ai_detection.ai_probability * 100).toFixed(1)}% AI Probability
                  </span>
                </div>
                {result.explanation.ai_detection.method && (
                  <p className="text-xs text-[var(--muted)] leading-relaxed mt-2 border-t border-[var(--card-border)]/50 pt-2">
                    Detection Method: {result.explanation.ai_detection.method}
                  </p>
                )}
              </div>
            )}

            {result.explanation.red_flags?.length > 0 && (
              <div className="mb-5">
                <h4 className="mb-2 text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5 uppercase tracking-wide">
                  <Flag className="h-3.5 w-3.5 text-[var(--danger)]" /> Detected Red Flags
                </h4>
                <div className="space-y-1.5">
                  {result.explanation.red_flags.map((flag, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      flag.severity === "critical" ? "border-[var(--danger)]/30 bg-[var(--danger-subtle)] text-[var(--danger)]"
                      : flag.severity === "high" ? "border-[var(--warning)]/30 bg-[var(--warning-subtle)] text-[var(--warning)]"
                      : "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)]"
                    }`}>
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5 text-xs">{flag.flag}</span>
                        {flag.message && <span className="opacity-80 text-xs">{flag.message}</span>}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {scamInd && scamInd.length > 0 && (
                    <div className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-subtle)]/50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-[var(--danger)] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Scam Indicators
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {scamInd.slice(0, 10).map((f, i) => (
                          <span key={i} className="rounded bg-[var(--background)] border border-[var(--danger)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--danger)]">{f.word}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {legitInd && legitInd.length > 0 && (
                    <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success-subtle)]/50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-[var(--success)] flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Legitimacy Indicators
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {legitInd.slice(0, 10).map((f, i) => (
                          <span key={i} className="rounded bg-[var(--background)] border border-[var(--success)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">{f.word}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        )}

        {/* Job Details */}
        {result.job_details && (
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                <FileText className="h-4 w-4" />
              </div>
              Job Details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.job_details.job_title && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Job Title</div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{result.job_details.job_title}</div>
                </div>
              )}
              {result.job_details.company_name && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Company</div>
                  <div className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[var(--accent)]" />{result.job_details.company_name}</div>
                </div>
              )}
              {result.job_details.email && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Email Found</div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{result.job_details.email}</div>
                </div>
              )}
              {result.job_details.salary && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Salary</div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{result.job_details.salary}</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* NER Entities */}
        {result.explanation?.entity_analysis && result.explanation.entity_analysis.entity_count > 0 && (
          <Card>
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                <Globe className="h-4 w-4" />
              </div>
              Extracted Entities
              <span className="ml-auto text-xs font-normal text-[var(--muted)]">{result.explanation.entity_analysis.entity_count} found</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {result.explanation.entity_analysis.companies_found?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center gap-1"><Building2 className="h-3 w-3" /> Companies</div>
                  <div className="flex flex-wrap gap-1">{result.explanation.entity_analysis.companies_found.map((c, i) => (
                    <span key={i} className="rounded bg-[var(--accent-subtle)] border border-[var(--accent)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">{c}</span>
                  ))}</div>
                </div>
              )}
              {result.explanation.entity_analysis.locations_found?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> Locations</div>
                  <div className="flex flex-wrap gap-1">{result.explanation.entity_analysis.locations_found.map((l, i) => (
                    <span key={i} className="rounded bg-[var(--success-subtle)] border border-[var(--success)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">{l}</span>
                  ))}</div>
                </div>
              )}
              {result.explanation.entity_analysis.money_found?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Money</div>
                  <div className="flex flex-wrap gap-1">{result.explanation.entity_analysis.money_found.map((m, i) => (
                    <span key={i} className="rounded bg-[var(--warning-subtle)] border border-[var(--warning)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--warning)]">{m}</span>
                  ))}</div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-1 space-y-6">
        {/* Risk Score */}
        <Card variant={result.risk_level === "Safe" ? "success" : result.risk_level === "High Risk" ? "danger" : "warning"} padding="lg">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium opacity-80 mb-0.5">Risk Assessment</p>
              <h2 className="text-xl font-semibold">Overall Score</h2>
            </div>
            <div className="text-left">
              <div className="text-4xl font-bold mb-2 tracking-tight">{result.risk_score.toFixed(1)}</div>
              <RiskBadge level={result.risk_level} size="sm" />
            </div>
          </div>
        </Card>

        {/* Salary Analysis */}
        {result.salary_analysis && (
          <Card padding="md">
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--warning-subtle)] text-[var(--warning)]">
                <IndianRupee className="h-3.5 w-3.5" />
              </div>
              Salary Analysis
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-0.5">Anomaly</div>
                <div className={`text-lg font-bold ${result.salary_analysis.anomaly_score > 0.5 ? "text-[var(--danger)]" : result.salary_analysis.anomaly_score > 0.2 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>{(result.salary_analysis.anomaly_score * 100).toFixed(0)}%</div>
              </div>
              {result.salary_analysis.ml_prediction && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-0.5">Predicted</div>
                  <div className="text-sm font-bold text-[var(--accent)] mt-1">{formatToLPA(result.salary_analysis.ml_prediction.predicted_salary)}</div>
                </div>
              )}
            </div>
            {Array.isArray(result.salary_analysis.analysis) && result.salary_analysis.analysis.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {result.salary_analysis.analysis.slice(0, 2).map((msg, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-[var(--muted)]">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--warning)]" />
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Company Trust Score */}
        {result.company_trust && (
          <Card padding="md">
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-md ${result.company_trust.trust_score >= 60 ? "bg-[var(--success-subtle)] text-[var(--success)]" : result.company_trust.trust_score >= 30 ? "bg-[var(--warning-subtle)] text-[var(--warning)]" : "bg-[var(--danger-subtle)] text-[var(--danger)]"}`}>
                <Shield className="h-3.5 w-3.5" />
              </div>
              Company Reputation
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-0.5">Trust Score</div>
                <div className={`text-xl font-bold ${result.company_trust.trust_score >= 60 ? "text-[var(--success)]" : result.company_trust.trust_score >= 30 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>{result.company_trust.trust_score}<span className="text-xs">/100</span></div>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-0.5">Level</div>
                <div className="text-xs font-bold text-[var(--foreground)] mt-1 capitalize">{result.company_trust.trust_level}</div>
              </div>
            </div>
            {result.company_trust.details?.domain?.reasons && result.company_trust.details.domain.reasons.length > 0 && (
              <div className="space-y-1.5">
                {result.company_trust.details.domain.reasons.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-[var(--muted)]">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {r}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Download Action */}
        {activeTab === "url" && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                 if (scannedUrl) handleDownloadPdf(scannedUrl);
              }}
              disabled={isDownloadingPdf}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-all duration-200 hover:bg-[var(--accent-subtle)] disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {isDownloadingPdf ? "Generating PDF..." : "Download Report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
