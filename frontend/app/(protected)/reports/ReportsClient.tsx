"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  getReportsAction, 
  getBlacklistAction, 
  createReportAction, 
  voteReportAction 
} from "@/lib/actions/reports";
import type { ScamReport, BlacklistItem } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import Card from "@/components/Card";
import { CopyPlus, Ban, List, ThumbsUp, ThumbsDown, Building2, ExternalLink } from "lucide-react";

type View = "reports" | "blacklist" | "submit";

interface ReportsClientProps {
  initialReports: ScamReport[];
  initialTotalPages: number;
  initialBlacklist: BlacklistItem[];
}

export default function ReportsClient({ initialReports, initialTotalPages, initialBlacklist }: ReportsClientProps) {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<View>("reports");
  
  // Data State
  const [reports, setReports] = useState<ScamReport[]>(initialReports);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>(initialBlacklist);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  
  // Loading & Error States
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  
  // Form State
  const [submitMsg, setSubmitMsg] = useState("");

  async function fetchReports(p: number) {
    setError("");
    startTransition(async () => {
      const res = await getReportsAction(p, 20);
      if (res.success && res.data) {
        setReports(res.data.reports);
        setTotalPages(res.data.total_pages);
      } else {
        setError(res.error || "Failed to load reports");
      }
    });
  }

  async function fetchBlacklist() {
    setError("");
    startTransition(async () => {
      const res = await getBlacklistAction();
      if (res.success && res.data) {
        setBlacklist(res.data.blacklist);
      } else {
        setError(res.error || "Failed to load blacklist");
      }
    });
  }

  function handleViewChange(v: View) { 
    setView(v); 
    if (v === "blacklist") fetchBlacklist(); 
    if (v === "reports") fetchReports(1); 
  }

  async function handleVote(id: number, type: "up"|"down") { 
    if (!isAuthenticated) return;
    
    // Optimistic UI update
    setReports(prev => prev.map(r => r.id === id ? {
      ...r,
      upvotes: type === "up" ? r.upvotes + 1 : r.upvotes,
      downvotes: type === "down" ? r.downvotes + 1 : r.downvotes
    } : r));

    try {
      const res = await voteReportAction(id, type);
      if (!res.success) {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to vote");
      fetchReports(page); // revert
    } 
  }

  function handlePageChange(p: number) { 
    setPage(p); 
    fetchReports(p); 
  }

  async function handleFormSubmit(formData: FormData) {
    setError("");
    setSubmitMsg("");
    
    startTransition(async () => {
      const res = await createReportAction(null, formData);
      if (res.success) {
        setSubmitMsg("Report submitted successfully. Thank you for contributing.");
        // Reset form optionally, or just leave it
        const form = document.querySelector("form") as HTMLFormElement;
        form?.reset();
      } else {
        setError(res.error || "Failed to submit report");
      }
    });
  }

  const inputCls = "w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none";

  return (
    <>
      {/* Tabs */}
      <div className="mb-8 flex gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 shadow-[var(--shadow-sm)]">
        {(["reports", "blacklist", "submit"] as View[]).map((v) => (
          <button key={v} onClick={() => handleViewChange(v)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 capitalize ${view === v
              ? "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]/50"}`}>
            {v === "submit" ? <><CopyPlus className="h-4 w-4" /> Submit Report</> : v === "blacklist" ? <><Ban className="h-4 w-4" /> Blacklist</> : <><List className="h-4 w-4" /> Reports</>}
          </button>
        ))}
      </div>

      {error && <div className="mb-6"><ErrorDisplay message={error} onRetry={() => { setError(""); view === "reports" ? fetchReports(page) : fetchBlacklist(); }} /></div>}

      {/* Reports */}
      {view === "reports" && (
        isPending ? <LoadingSpinner message="Loading community reports..." /> : (
          <div className="space-y-5 animate-fade-in">
            {reports.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[var(--muted)]" />
                      {r.company_name}
                    </h3>
                    {r.job_title && <p className="text-sm font-medium text-[var(--muted)] mt-1">{r.job_title}</p>}
                    {r.job_url && (
                      <a href={r.job_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 mt-1 font-medium w-fit">
                        View Job Posting <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent)] h-fit shrink-0">
                    {r.category.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mb-5 rounded-xl bg-[var(--background)] p-4 border border-[var(--card-border)]/50">
                  <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">{r.description}</p>
                  {r.evidence && (
                    <div className="mt-3 pt-3 border-t border-[var(--card-border)]/50">
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">Evidence</p>
                      <p className="text-xs text-[var(--muted)]/80 italic">{r.evidence}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--card-border)]/50 pt-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleVote(r.id, "up")} disabled={!isAuthenticated}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--success)]/50 hover:bg-[var(--success-subtle)] hover:text-[var(--success)] disabled:opacity-50 group">
                      <ThumbsUp className="h-4 w-4 group-hover:fill-[var(--success)] transition-all" /> <span>{r.upvotes}</span>
                    </button>
                    <button onClick={() => handleVote(r.id, "down")} disabled={!isAuthenticated}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--danger)]/50 hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)] disabled:opacity-50 group">
                      <ThumbsDown className="h-4 w-4 group-hover:fill-[var(--danger)] transition-all" /> <span>{r.downvotes}</span>
                    </button>
                  </div>
                  <div className="text-xs font-medium text-[var(--muted)] flex items-center gap-3">
                    <span>By: <span className="text-[var(--foreground)]">{r.username}</span></span>
                    <span className="h-1 w-1 rounded-full bg-[var(--muted)]/30" />
                    <span>{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </Card>
            ))}
            {reports.length === 0 && (
              <div className="py-16 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                <List className="h-10 w-10 text-[var(--muted)]/50 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">No reports found</h3>
                <p className="text-sm text-[var(--muted)]">Be the first to submit a scam report to help the community.</p>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page <= 1}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-50 shadow-sm">← Prev</button>
                <span className="text-sm font-medium text-[var(--muted)] bg-[var(--background)] px-4 py-1.5 rounded-lg border border-[var(--card-border)]">Page {page} of {totalPages}</span>
                <button onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-50 shadow-sm">Next →</button>
              </div>
            )}
          </div>
        )
      )}

      {/* Blacklist */}
      {view === "blacklist" && (
        isPending ? <LoadingSpinner message="Loading blacklist database..." /> : (
          <div className="space-y-3 animate-fade-in">
            <div className="mb-6 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-subtle)]/50 p-4">
              <h3 className="text-sm font-bold text-[var(--danger)] flex items-center gap-2 mb-1">
                <Ban className="h-4 w-4" /> Known Offenders Database
              </h3>
              <p className="text-xs font-medium text-[var(--danger)]/80">Companies listed here have multiple verified reports of fraudulent behavior.</p>
            </div>
            {blacklist.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition-all hover:shadow-[var(--shadow-md)] hover:border-[var(--danger)]/30 group">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--danger-subtle)] text-[var(--danger)] transition-transform group-hover:scale-105">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--foreground)] text-base">{b.company_name}</h4>
                    <span className="text-xs font-medium text-[var(--danger)] flex items-center gap-1 mt-0.5"><Ban className="h-3 w-3" /> Blacklisted Entity</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-extrabold tracking-tighter text-[var(--foreground)]">{b.total_reports}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Reports</span>
                </div>
              </div>
            ))}
            {blacklist.length === 0 && (
              <div className="py-16 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl">
                <Ban className="h-10 w-10 text-[var(--success)]/50 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Blacklist Empty</h3>
                <p className="text-sm text-[var(--muted)]">No companies have reached the blacklist threshold yet.</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Submit */}
      {view === "submit" && (
        !isAuthenticated ? (
          <div className="py-16 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
            <CopyPlus className="h-10 w-10 text-[var(--muted)]/50 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Sign in to submit</h3>
            <p className="text-sm text-[var(--muted)]">You must be logged in to contribute to the community.</p>
          </div>
        ) : (
          <Card animate className="border-t-4 border-t-[var(--accent)]">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--foreground)]">File a Scam Report</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Provide clear, accurate details to help protect others from employment fraud.</p>
            </div>
            <form action={handleFormSubmit} className="space-y-5">
              {submitMsg && <div className="animate-fade-in rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/20 p-4 text-sm font-medium text-[var(--success)] flex items-center gap-2"><ThumbsUp className="h-4 w-4" /> {submitMsg}</div>}
              
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Company Name <span className="text-[var(--danger)]">*</span></label>
                <input name="company_name" required placeholder="Fraudulent Corp LLC" className={inputCls} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Description of the Scam <span className="text-[var(--danger)]">*</span></label>
                <textarea name="description" required rows={4} placeholder="Explain what happened in detail. How did they contact you? What red flags did you notice?" className={inputCls} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Title <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input name="job_title" placeholder="Data Entry Clerk" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job URL <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                  <input name="job_url" type="url" placeholder="https://..." className={inputCls} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Category <span className="text-[var(--danger)]">*</span></label>
                <select name="category" defaultValue="other" className={inputCls}>
                  <option value="other">Other</option>
                  <option value="phishing">Phishing / Info Harvesting</option>
                  <option value="fake_company">Fake Company / Identity</option>
                  <option value="upfront_payment">Upfront Payment / Equipment Scam</option>
                  <option value="identity_theft">Identity Theft / KYC Fraud</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Evidence <span className="text-[var(--muted)] font-normal">(optional)</span></label>
                <textarea name="evidence" rows={2} placeholder="Links to emails, messages, or screenshots..." className={inputCls} />
              </div>

              <button type="submit" disabled={isPending}
                className="w-full sm:w-auto mt-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
                {isPending ? "Submitting Report..." : "Submit Report securely"}
              </button>
            </form>
          </Card>
        )
      )}
    </>
  );
}
