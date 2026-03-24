"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadResumeAction, matchResumeAction, downloadMatchPdfAction } from "@/lib/actions/resume";
import type { ResumeListItem, ResumeUploadResult, MatchResult } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import Card from "@/components/Card";
import { UploadCloud, CheckCircle2, FileText, Target, AlertTriangle, Lightbulb, BookOpen, FileDown } from "lucide-react";

export default function ResumeUploader({
  initialResumes,
}: {
  initialResumes: ResumeListItem[];
}) {
  const router = useRouter();
  
  const [resumes, setResumes] = useState<ResumeListItem[]>(initialResumes);
  
  // Sync state if server re-fetches
  useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  
  // Upload State
  const [isUploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ResumeUploadResult | null>(null);

  // Match State
  const [isMatching, startMatch] = useTransition();
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchedParams, setMatchedParams] = useState<{jobUrl?: string; jobText?: string} | null>(null);
  
  const [isDownloadingPdf, startPdfDownload] = useTransition();

  const handleDownloadPdf = () => {
    if (!selectedResumeId || !matchedParams) return;
    
    startPdfDownload(async () => {
      const res = await downloadMatchPdfAction(
        selectedResumeId,
        matchedParams.jobUrl || undefined,
        matchedParams.jobText || undefined
      );
      
      if (res.success && res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        alert(res.error || "Failed to download PDF.");
      }
    });
  };

  // Handle direct file select for upload
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    startUpload(async () => {
      const res = await uploadResumeAction(null, formData);
      if (!res) return;

      if (res.success) {
        setUploadResult(res.data);
        // Refresh the server component to pull the new resume list!
        router.refresh();
      } else {
        setUploadError(res.error);
      }
    });
  }

  async function handleMatchForm(formData: FormData) {
    setMatchError(null);
    setMatchResult(null);

    const jobUrl = formData.get("job_url") as string;
    const jobText = formData.get("job_text") as string;

    startMatch(async () => {
      const res = await matchResumeAction(null, formData);
      if (!res) return;

      if (res.success) {
        setMatchResult(res.data);
        setMatchedParams({ jobUrl, jobText });
      } else {
        setMatchError(res.error);
      }
    });
  }

  return (
    <>
      {/* Upload Dropzone */}
      <Card animate className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">Upload Resume</h2>
        <label className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)] p-10 transition-all duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 group ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110">
            <UploadCloud className="h-7 w-7" />
          </div>
          <span className="mb-2 text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">Click to document</span>
          <span className="text-sm font-medium text-[var(--muted)]">PDF, DOCX, or TXT (Max 5MB)</span>
          <span className="mt-4 rounded-lg bg-[var(--card-border)]/50 px-3 py-1 text-xs text-[var(--muted)]">Skills & experience are automatically extracted</span>
          <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="hidden" disabled={isUploading} />
        </label>
      </Card>

      {isUploading && <LoadingSpinner message="Parsing resume securely..." />}
      {uploadError && <div className="mb-6"><ErrorDisplay message={uploadError} onRetry={() => setUploadError(null)} /></div>}

      {/* Upload Success Output */}
      {uploadResult && (
        <Card variant="success" animate className="mb-6 border-[var(--success)]/20">
          <h3 className="mb-4 font-bold text-[var(--foreground)] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            File Parsed: {uploadResult.filename}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[var(--success)]/20 pt-4">
            {[
              { label: "Skills Found", value: uploadResult.total_skills_found },
              { label: "Experience", value: `${uploadResult.experience_years}y` },
              { label: "Word Count", value: uploadResult.word_count },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--success)]/10 bg-[var(--background)] p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-[var(--foreground)]">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {uploadResult.skills && (
            <div className="mt-5 space-y-4">
              {Object.entries(uploadResult.skills).map(([cat, skills]) =>
                skills && skills.length > 0 ? (
                  <div key={cat}>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">{cat.replace(/_/g, " ")}</span>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s: string) => (
                        <span key={s} className="rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/20 px-3 py-1 text-xs font-medium text-[var(--accent)] shadow-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </Card>
      )}

      {/* Selectable Resume Library */}
      {resumes.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">Your Resumes</h2>
          <div className="space-y-3">
            {resumes.map((r) => (
              <div key={r.id} onClick={() => setSelectedResumeId(r.id)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${selectedResumeId === r.id
                  ? "border-[var(--accent)] bg-[var(--accent-subtle)] shadow-[var(--shadow-md)]"
                  : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]/50 hover:shadow-[var(--shadow-sm)]"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedResumeId === r.id ? "bg-[var(--accent)] text-white" : "bg-[var(--card-border)] text-[var(--muted)]"}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--foreground)] block">{r.filename}</span>
                      <span className="text-xs text-[var(--muted)]">{new Date(r.uploaded_at).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                  {selectedResumeId === r.id && (
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Request Zone */}
      {resumes.length > 0 && (
        <Card animate className="border-t-4 border-t-[var(--accent)]">
          <h2 className="mb-5 text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
              <Target className="h-5 w-5" />
            </div>
            Match Against Job
          </h2>
          <form action={handleMatchForm} className="space-y-5">
            <input type="hidden" name="resume_id" value={selectedResumeId || ""} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Selected Resume</label>
              <select value={selectedResumeId || ""} onChange={(e) => setSelectedResumeId(Number(e.target.value))} required
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] font-medium transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none">
                <option value="" disabled>Select a resume below to begin...</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Job Link</label>
                <input name="job_url" type="url" placeholder="https://company.com/job"
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Or Job Description</label>
                <textarea name="job_text" rows={3} placeholder="Paste full JD here..."
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
              </div>
            </div>
            <button type="submit" disabled={isMatching || !selectedResumeId}
              className="w-full rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-md)] disabled:opacity-50">
              {isMatching ? "Computing Match..." : "Run AI Match Analysis"}
            </button>
          </form>
          
          {isMatching && <LoadingSpinner message="Analyzing alignment between resume and job..." />}
          {matchError && <div className="mt-6"><ErrorDisplay message={matchError} onRetry={() => setMatchError(null)} /></div>}

          {matchResult && (
            <div className="mt-8 space-y-6 animate-fade-in border-t border-[var(--card-border)] pt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-[var(--accent-subtle)]/50 border border-[var(--accent)]/20 p-6">
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-[var(--muted)] flex items-center gap-1.5 mb-1">
                    <Target className="h-4 w-4 text-[var(--accent)]" /> 
                    Overall Suitability
                  </div>
                  <div className="text-5xl font-extrabold text-[var(--accent)] tracking-tighter">
                    {matchResult.match_score.toFixed(0)}%
                  </div>
                </div>
                {matchResult.ats_score && (
                  <div className="rounded-xl bg-[var(--card)] p-4 border border-[var(--card-border)] text-center shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)] mb-1">Estimated ATS Score</div>
                    <div className="text-2xl font-bold text-[var(--foreground)]">{matchResult.ats_score.score}<span className="text-lg text-[var(--muted)]">/100</span></div>
                  </div>
                )}
              </div>
              
              <div className="grid gap-5 md:grid-cols-2">
                {matchResult.strengths.length > 0 && (
                  <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-subtle)]/30 p-5">
                    <h4 className="mb-3 text-sm font-bold text-[var(--success)] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Core Strengths
                    </h4>
                    <ul className="space-y-2">
                      {matchResult.strengths.map((s,i)=>(
                         <li key={i} className="text-sm text-[var(--muted)] flex items-start gap-2">
                          <span className="text-[var(--success)] mt-0.5">•</span> <span>{s.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {matchResult.weaknesses.length > 0 && (
                  <div className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-subtle)]/30 p-5">
                    <h4 className="mb-3 text-sm font-bold text-[var(--warning)] flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Identified Gaps
                    </h4>
                    <ul className="space-y-2">
                      {matchResult.weaknesses.map((w,i)=>(
                        <li key={i} className="text-sm text-[var(--muted)] flex items-start gap-2">
                          <span className="text-[var(--warning)] mt-0.5">•</span> <span>{w.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {matchResult.recommendations.length > 0 && (
                <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--background)] p-5 shadow-sm">
                  <h4 className="mb-3 text-sm font-bold text-[var(--accent)] flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" /> Recommended Action Plan
                  </h4>
                  <ul className="space-y-3">
                    {matchResult.recommendations.map((r,i)=>(
                      <li key={i} className="text-sm text-[var(--muted)] flex items-start gap-3 rounded-lg bg-[var(--accent-subtle)]/30 p-3">
                        <BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)] mt-0.5" /> <span>{r.title} — {r.platform}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--background)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:bg-[var(--accent-subtle)] disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  {isDownloadingPdf ? "Generating PDF..." : "Download Full PDF Report"}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
