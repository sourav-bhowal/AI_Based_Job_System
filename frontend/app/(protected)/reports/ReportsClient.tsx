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
import { ScamReport as BaseScamReport } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import Card from "@/components/Card";
import { CopyPlus, Ban, List, ThumbsUp, ThumbsDown, Building2, ExternalLink, Filter, ArrowRight } from "lucide-react";

// Extend the base type for frontend use
interface ScamReportWithVote extends BaseScamReport {
  user_vote?: "up" | "down" | null;
}

type View = "reports" | "blacklist" | "submit";

interface ReportsClientProps {
  initialReports: ScamReportWithVote[];
  initialTotalPages: number;
  initialBlacklist: BlacklistItem[];
}

export default function ReportsClient({ initialReports, initialTotalPages, initialBlacklist }: ReportsClientProps) {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<View>("reports");
  
  // Data State
  const [reports, setReports] = useState<ScamReportWithVote[]>(initialReports);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>(initialBlacklist);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  
  // Filtering & Sorting State (Mock UI for visual completeness as per prompt constraints)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [activeSort, setActiveSort] = useState("recent");
  
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
    setReports(prev => prev.map(r => {
      if (r.id !== id) return r;
      let newUp = r.upvotes;
      let newDown = r.downvotes;
      let newVote = r.user_vote;
      
      const featureEnabled = process.env.NEXT_PUBLIC_ENABLE_REPORT_VOTES_USER_STATE === "true";
      
      if (featureEnabled && r.user_vote === type) {
        // Toggle off
        newVote = null;
        if (type === "up") newUp--;
        if (type === "down") newDown--;
      } else if (featureEnabled && r.user_vote) {
        // Switch vote
        newVote = type;
        if (type === "up") { newUp++; newDown--; }
        if (type === "down") { newDown++; newUp--; }
      } else {
        // New vote
        newVote = type;
        if (type === "up") newUp++;
        if (type === "down") newDown++;
      }
      
      return {
        ...r,
        upvotes: newUp,
        downvotes: newDown,
        user_vote: newVote
      };
    }));

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
        const form = document.querySelector("form") as HTMLFormElement;
        form?.reset();
      } else {
        setError(res.error || "Failed to submit report");
      }
    });
  }

  const inputCls = "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none";

  const renderReportsList = () => (
    isPending ? <LoadingSpinner message="Loading community reports..." /> : (
      <div className="space-y-4 animate-fade-in">
        {reports.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--muted)]" />
                  {r.company_name}
                </h3>
                {r.job_title && <p className="text-xs font-semibold text-[var(--muted)] mt-1">{r.job_title}</p>}
                {r.job_url && (
                  <a href={r.job_url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase font-bold text-[var(--accent)] hover:underline flex items-center gap-1 mt-1.5 w-fit">
                    View Job Posting <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <span className="rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent)] h-fit shrink-0">
                {r.category.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mb-4 rounded-xl bg-[var(--background)] p-3.5 border border-[var(--card-border)]/50">
              <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap font-medium">{r.description}</p>
              {r.evidence && (
                <div className="mt-3 pt-3 border-t border-[var(--card-border)]/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Evidence</p>
                  <p className="text-xs text-[var(--muted)] italic whitespace-pre-wrap">{r.evidence}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--card-border)]/50 pt-3">
              <div className="flex items-center gap-2">
                <button onClick={() => handleVote(r.id, "up")} disabled={!isAuthenticated}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-bold transition-all hover:border-[var(--success)]/50 hover:bg-[var(--success-subtle)] hover:text-[var(--success)] disabled:opacity-50 group ${process.env.NEXT_PUBLIC_ENABLE_REPORT_VOTES_USER_STATE === "true" && r.user_vote === "up" ? "border-[var(--success)]/50 bg-[var(--success-subtle)] text-[var(--success)]" : "text-[var(--foreground)]"}`}>
                  <ThumbsUp className={`h-4 w-4 transition-all ${process.env.NEXT_PUBLIC_ENABLE_REPORT_VOTES_USER_STATE === "true" && r.user_vote === "up" ? "fill-[var(--success)]" : "group-hover:fill-[var(--success)]"}`} /> <span>{r.upvotes}</span>
                </button>
                <button onClick={() => handleVote(r.id, "down")} disabled={!isAuthenticated}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs font-bold transition-all hover:border-[var(--danger)]/50 hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)] disabled:opacity-50 group ${process.env.NEXT_PUBLIC_ENABLE_REPORT_VOTES_USER_STATE === "true" && r.user_vote === "down" ? "border-[var(--danger)]/50 bg-[var(--danger-subtle)] text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
                  <ThumbsDown className={`h-4 w-4 transition-all ${process.env.NEXT_PUBLIC_ENABLE_REPORT_VOTES_USER_STATE === "true" && r.user_vote === "down" ? "fill-[var(--danger)]" : "group-hover:fill-[var(--danger)]"}`} /> <span>{r.downvotes}</span>
                </button>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-3">
                <span>By: <span className="text-[var(--foreground)]">{r.username}</span></span>
                <span className="h-1 w-1 rounded-full bg-[var(--muted)]/30" />
                <span>{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </Card>
        ))}
        {reports.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
            <List className="h-10 w-10 text-[var(--muted)]/50 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">No reports found</h3>
            <p className="text-sm text-[var(--muted)]">Be the first to submit a scam report to help the community.</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page <= 1}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-50 shadow-sm">← Prev</button>
            <span className="text-xs font-bold text-[var(--muted)] bg-[var(--background)] px-3 py-1.5 rounded-lg border border-[var(--card-border)]">Page {page} of {totalPages}</span>
            <button onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 disabled:opacity-50 shadow-sm">Next →</button>
          </div>
        )}
      </div>
    )
  );

  const renderSidebar = () => (
    <div className="space-y-6">
      {/* Filtering */}
      <Card className="flex flex-col gap-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
          <Filter className="h-4 w-4" /> Filter Options
        </h3>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] mb-1.5 block">Sort By</label>
          <select value={activeSort} onChange={(e) => setActiveSort(e.target.value)} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]">
            <option value="recent">Most Recent</option>
            <option value="upvotes">Highest Voted</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] mb-1.5 block">Category</label>
          <select value={activeCategoryFilter} onChange={(e) => setActiveCategoryFilter(e.target.value)} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]">
            <option value="all">All Categories</option>
            <option value="phishing">Phishing</option>
            <option value="fake_company">Fake Company</option>
            <option value="upfront_payment">Upfront Payment</option>
            <option value="identity_theft">Identity Theft</option>
          </select>
        </div>
      </Card>

      {/* CTA */}
      <Card className="bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
        <h3 className="text-sm font-bold text-[var(--accent)] mb-2 flex items-center gap-2"><CopyPlus className="h-5 w-5" /> Help Protect Others</h3>
        <p className="text-xs text-[var(--foreground)] font-medium mb-4">Have you encountered a fraudulent job posting? Report it to warn the community.</p>
        <button onClick={() => handleViewChange("submit")} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2.5 text-xs font-bold tracking-wide shadow-sm hover:bg-[var(--accent-light)] transition-all">
          Submit New Report <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </Card>

      {/* Mini Blacklist Preview */}
      {blacklist.length > 0 && (
        <Card padding="md" className="border border-[var(--danger)]/20">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--card-border)] pb-2">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--danger)] flex items-center gap-1.5">
               <Ban className="h-3.5 w-3.5" /> Known Offenders
             </h3>
             <button onClick={() => handleViewChange("blacklist")} className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {blacklist.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground)] truncate max-w-[150px]">{b.company_name}</span>
                <span className="text-[10px] font-extrabold bg-[var(--danger-subtle)] text-[var(--danger)] px-1.5 py-0.5 rounded">{b.total_reports}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderSubmitForm = () => (
    <div className="max-w-2xl mx-auto w-full">
      {!isAuthenticated ? (
        <div className="py-16 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]">
          <CopyPlus className="h-10 w-10 text-[var(--muted)]/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">Sign in to submit</h3>
          <p className="text-sm text-[var(--muted)]">You must be logged in to contribute to the community.</p>
        </div>
      ) : (
        <Card animate className="border-t-4 border-t-[var(--accent)]">
          <div className="mb-6 border-b border-[var(--card-border)] pb-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">File a Scam Report</h2>
            <p className="text-xs font-semibold text-[var(--muted)] mt-1">Provide clear, accurate details to help protect others from employment fraud.</p>
          </div>
          <form action={handleFormSubmit} className="space-y-4">
            {submitMsg && <div className="animate-fade-in rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/20 p-4 text-xs font-bold text-[var(--success)] flex items-center gap-2"><ThumbsUp className="h-4 w-4" /> {submitMsg}</div>}
            
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Company Name <span className="text-[var(--danger)]">*</span></label>
              <input name="company_name" required placeholder="Fraudulent Corp LLC" className={inputCls} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Description of the Scam <span className="text-[var(--danger)]">*</span></label>
              <textarea name="description" required rows={4} placeholder="Explain what happened in detail. How did they contact you? What red flags did you notice?" className={inputCls} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Job Title <span className="lowercase font-normal opacity-70">(optional)</span></label>
                <input name="job_title" placeholder="Data Entry Clerk" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Job URL <span className="lowercase font-normal opacity-70">(optional)</span></label>
                <input name="job_url" type="url" placeholder="https://..." className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Category <span className="text-[var(--danger)]">*</span></label>
              <select name="category" defaultValue="other" className={inputCls}>
                <option value="other">Other</option>
                <option value="phishing">Phishing / Info Harvesting</option>
                <option value="fake_company">Fake Company / Identity</option>
                <option value="upfront_payment">Upfront Payment / Equipment Scam</option>
                <option value="identity_theft">Identity Theft / KYC Fraud</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Evidence <span className="lowercase font-normal opacity-70">(optional)</span></label>
              <textarea name="evidence" rows={2} placeholder="Links to emails, messages, or screenshots..." className={inputCls} />
              {process.env.NEXT_PUBLIC_ENABLE_REPORT_FILE_UPLOAD === "true" && (
                <div className="mt-2">
                  <input type="file" name="file" accept="image/*,.pdf,.doc,.docx" className="text-xs text-[var(--muted)] file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent-subtle)] file:text-[var(--accent)] hover:file:bg-[var(--accent)] hover:file:text-white transition-all cursor-pointer" />
                </div>
              )}
            </div>

            <button type="submit" disabled={isPending}
              className="w-full mt-2 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all duration-200 hover:bg-[var(--accent-light)] disabled:opacity-50">
              {isPending ? "Submitting Report..." : "Submit Report Securely"}
            </button>
          </form>
        </Card>
      )}
    </div>
  );

  const renderBlacklist = () => (
    <div className="max-w-4xl mx-auto w-full space-y-4">
      <div className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-subtle)]/50 p-5">
        <h3 className="text-sm font-bold text-[var(--danger)] flex items-center gap-2 mb-1">
          <Ban className="h-5 w-5" /> Known Offenders Database
        </h3>
        <p className="text-xs font-medium text-[var(--danger)]/80">Companies listed here have multiple verified reports of fraudulent behavior.</p>
      </div>
      {blacklist.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-all hover:shadow-[var(--shadow-md)] hover:border-[var(--danger)]/30 group">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--danger-subtle)] text-[var(--danger)] transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-[var(--foreground)] text-sm">{b.company_name}</h4>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--danger)] flex items-center gap-1 mt-0.5"><Ban className="h-3 w-3" /> Blacklisted Entity</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-extrabold tracking-tighter text-[var(--foreground)]">{b.total_reports}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Reports</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1 shadow-sm max-w-fit">
        {(["reports", "blacklist", "submit"] as View[]).map((v) => (
          <button key={v} onClick={() => handleViewChange(v)}
            className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all duration-200 capitalize ${view === v
              ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]/50"}`}>
            {v === "submit" ? <><CopyPlus className="h-3.5 w-3.5" /> Submit Report</> : v === "blacklist" ? <><Ban className="h-3.5 w-3.5" /> Blacklist</> : <><List className="h-3.5 w-3.5" /> Reports</>}
          </button>
        ))}
      </div>

      {error && <div className="mb-6"><ErrorDisplay message={error} onRetry={() => { setError(""); view === "reports" ? fetchReports(page) : fetchBlacklist(); }} /></div>}

      {/* Main Content Area */}
      {view === "reports" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           <div className="lg:col-span-8">
              {renderReportsList()}
           </div>
           <div className="lg:col-span-4">
              {renderSidebar()}
           </div>
        </div>
      )}
      
      {view === "submit" && renderSubmitForm()}
      {view === "blacklist" && renderBlacklist()}
    </>
  );
}
