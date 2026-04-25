"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadResumeAction, matchResumeAction, getResumeAnalysisAction, deleteResumeAction } from "@/lib/actions/resume";
import type { ResumeListItem, ResumeUploadResult, MatchResult } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import Card from "@/components/Card";
import { UploadCloud, CheckCircle2, FileText, Target, AlertTriangle, Lightbulb, BookOpen, FileDown, Mail, Phone, Linkedin, Github, GraduationCap, User, Star, MapPin, Building2, BarChart3, Trash2 } from "lucide-react";

export default function ResumeUploader({
  initialResumes,
}: {
  initialResumes: ResumeListItem[];
}) {
  const router = useRouter();
  
  const [resumes, setResumes] = useState<ResumeListItem[]>(initialResumes);
  
  // Always sync server-fetched data to client state (no length guard — that causes stale data)
  useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  
  const [isUploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ResumeUploadResult | null>(null);

  const [isFetchingAnalysis, startFetchingAnalysis] = useTransition();
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResumeUploadResult | null>(null);

  const activeAnalysis = uploadResult || analysisResult;

  async function handleViewAnalysis(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setAnalysisError(null);
    setAnalysisResult(null);
    setUploadResult(null);
    setMatchResult(null);
    
    startFetchingAnalysis(async () => {
      const res = await getResumeAnalysisAction(id);
      if (res && res.success && res.data) {
        setAnalysisResult(res.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setAnalysisError(res?.error || "Failed to fetch analysis");
      }
    });
  }

  const [isDeleting, startDeleting] = useTransition();

  async function handleDeleteResume(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume? This will also delete any matching history associated with it.")) return;

    startDeleting(async () => {
      const res = await deleteResumeAction(id);
      if (res && res.success) {
        setResumes(prev => prev.filter(r => r.id !== id));
        if (selectedResumeId === id) setSelectedResumeId(null);
        if (activeAnalysis?.resume_id === id) {
          setUploadResult(null);
          setAnalysisResult(null);
        }
      } else {
        alert(res?.error || "Failed to delete resume");
      }
    });
  }

  const [isMatching, startMatch] = useTransition();
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchedParams, setMatchedParams] = useState<{jobUrl?: string; jobText?: string} | null>(null);
  
  const [isDownloadingPdf, startPdfDownload] = useTransition();

  const handleDownloadPdf = () => {
    if (!selectedResumeId || !matchedParams) return;
    
    startPdfDownload(async () => {
      try {
        const response = await fetch("/api/reports/generate-match-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume_id: selectedResumeId,
            job_url: matchedParams.jobUrl || undefined,
            job_text: matchedParams.jobText || undefined,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          let detail = "Failed to generate PDF";
          try { detail = JSON.parse(err).detail || detail; } catch {}
          throw new Error(detail);
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");
        const filename = disposition?.split("filename=")[1]?.replace(/"/g, "") || "match_report.pdf";

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        alert(err.message || "Failed to download PDF.");
      }
    });
  };

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

      if (res.success && res.data) {
        setUploadResult(res.data);
        
        // Optimistically add the new resume to the list so it appears instantly
        const newResume: ResumeListItem = {
          id: res.data.resume_id,
          filename: res.data.filename,
          skills: res.data.skills,
          experience: `${res.data.experience_years} years`,
          education: res.data.education || [],
          uploaded_at: new Date().toISOString()
        };
        
        setResumes(prev => [newResume, ...prev]);
        setSelectedResumeId(res.data.resume_id);
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

  const qualityColor = (score: number) =>
    score >= 75 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  const uploadSection = (
    <>
      <Card animate className="mb-6">
        <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">Upload Resume</h2>
        <label className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)] p-8 transition-all duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]/30 group ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110">
            <UploadCloud className="h-6 w-6" />
          </div>
          <span className="mb-1.5 text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">Click to upload</span>
          <span className="text-xs font-medium text-[var(--muted)]">PDF, DOCX, or TXT (Max 5MB)</span>
          <span className="mt-3 rounded-lg bg-[var(--card-border)]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Skills & experience are automatically extracted</span>
          <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="hidden" disabled={isUploading} />
        </label>
      </Card>
      {isUploading && <LoadingSpinner message="Parsing resume securely..." />}
      {uploadError && <div className="mb-6"><ErrorDisplay message={uploadError} onRetry={() => setUploadError(null)} /></div>}
    </>
  );

  const activeAnalysisDetails = activeAnalysis ? (
    <Card animate className="mb-6 shadow-sm">
      <h3 className="mb-4 font-bold text-[var(--foreground)] flex items-center gap-2 text-base">
        <FileText className="h-5 w-5 text-[var(--accent)]" />
        Analysis: {activeAnalysis.filename}
      </h3>

      {activeAnalysis.education && activeAnalysis.education.length > 0 && (
        <div className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Education</h4>
          <ul className="space-y-1.5">
            {activeAnalysis.education.map((e, i) => (
              <li key={i} className="text-sm text-[var(--foreground)] font-medium flex items-start gap-2"><span className="text-[var(--accent)] mt-0.5">•</span>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {activeAnalysis.quality_feedback && activeAnalysis.quality_feedback.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5 mb-2"><Star className="h-3.5 w-3.5" /> Resume Insights</h4>
          {activeAnalysis.quality_feedback.map((f, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium border ${f.type === "good" ? "bg-[var(--success-subtle)]/50 text-[var(--success)] border-[var(--success)]/20" : "bg-[var(--warning-subtle)]/50 text-[var(--warning)] border-[var(--warning)]/20"}`}>
              {f.type === "good" ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              {f.message}
            </div>
          ))}
        </div>
      )}

      {activeAnalysis.skills && (
        <div className="mt-5 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Extracted Skills</h4>
          {Object.entries(activeAnalysis.skills).map(([cat, skills]) =>
            skills && skills.length > 0 ? (
              <div key={cat}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] block mb-1.5 opacity-70">{cat.replace(/_/g, " ")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s: string) => (
                    <span key={s} className="rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">{s}</span>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </Card>
  ) : null;

  const activeAnalysisScore = activeAnalysis ? (
    <Card variant="success" animate className="mb-6 border-[var(--success)]/20 shadow-sm flex flex-col gap-4">
      {activeAnalysis.quality_score != null && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Resume Quality Score</div>
          <div className="text-5xl font-extrabold tracking-tighter" style={{ color: qualityColor(activeAnalysis.quality_score) }}>
            {activeAnalysis.quality_score}<span className="text-xl text-[var(--muted)]">/100</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 border-t border-[var(--success)]/20 pt-4">
        {[
          { label: "Skills Found", value: activeAnalysis.total_skills_found },
          { label: "Experience", value: `${activeAnalysis.experience_years}y` },
          { label: "Word Count", value: activeAnalysis.word_count },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--success)]/10 bg-[var(--background)] p-3 text-center">
            <div className="text-xl font-bold text-[var(--foreground)]">{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {activeAnalysis.contact && Object.keys(activeAnalysis.contact).length > 0 && (
        <div className="mt-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2 flex items-center gap-1.5"><User className="h-3 w-3" /> Contact Info</h4>
          <div className="flex flex-col gap-1.5">
            {activeAnalysis.contact.name && <div className="flex items-center gap-2 text-xs text-[var(--foreground)] font-medium truncate"><User className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />{activeAnalysis.contact.name}</div>}
            {activeAnalysis.contact.email && <div className="flex items-center gap-2 text-xs text-[var(--foreground)] font-medium truncate"><Mail className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />{activeAnalysis.contact.email}</div>}
            {activeAnalysis.contact.phone && <div className="flex items-center gap-2 text-xs text-[var(--foreground)] font-medium truncate"><Phone className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />{activeAnalysis.contact.phone}</div>}
            {activeAnalysis.contact.linkedin && <div className="flex items-center gap-2 text-xs text-[var(--foreground)] font-medium truncate"><Linkedin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />{activeAnalysis.contact.linkedin}</div>}
            {activeAnalysis.contact.github && <div className="flex items-center gap-2 text-xs text-[var(--foreground)] font-medium truncate"><Github className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />{activeAnalysis.contact.github}</div>}
          </div>
        </div>
      )}
    </Card>
  ) : null;

  const resumesLibrarySection = resumes.length > 0 ? (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Your Resumes</h2>
      {/* Scroll container with fade hints */}
      <div className="relative">
        {/* Top fade hint */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-5 rounded-t-xl bg-gradient-to-b from-[var(--background)] to-transparent opacity-0 transition-opacity [:has(>.scrollbar-thin:not(:first-child)):hover>&]:opacity-100" />
        <div className="max-h-[260px] sm:max-h-[320px] overflow-y-auto pr-1 scrollbar-thin space-y-2">
          {resumes.map((r) => (
            <div key={r.id} onClick={() => setSelectedResumeId(prev => prev === r.id ? null : r.id)}
              className={`group cursor-pointer rounded-xl border p-3 transition-all duration-200 ${selectedResumeId === r.id
                ? "border-[var(--accent)] bg-[var(--accent)]/[0.08] shadow-[0_0_0_1px_var(--accent)]/10"
                : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]/50 hover:bg-[var(--card-border)]/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${selectedResumeId === r.id ? "bg-[var(--accent)] text-white" : "bg-[var(--card-border)] text-[var(--muted)]"}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[var(--foreground)] block leading-tight truncate">{r.filename}</span>
                    <span className="text-xs font-medium text-[var(--muted)]">{new Date(r.uploaded_at).toLocaleDateString("en-US")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => handleViewAnalysis(e, r.id)}
                    disabled={isFetchingAnalysis || isDeleting}
                    title="View Analysis"
                    className="rounded-lg bg-[var(--accent-subtle)] p-2 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteResume(e, r.id)}
                    disabled={isFetchingAnalysis || isDeleting}
                    title="Delete Resume"
                    className="rounded-lg bg-[var(--danger)]/10 p-2 text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center ml-2 min-w-[24px]">
                  {selectedResumeId === r.id && (
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Bottom fade hint — visible when list overflows */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 rounded-b-xl bg-gradient-to-t from-[var(--background)] to-transparent" />
      </div>
      {(isFetchingAnalysis || isDeleting) && <LoadingSpinner message="Processing..." />}
      {analysisError && <div className="mt-4"><ErrorDisplay message={analysisError} onRetry={() => setAnalysisError(null)} /></div>}
    </div>
  ) : null;

  const matchFormSection = (
    <Card animate className="border-t-4 border-t-[var(--accent)]">
      <h2 className="mb-5 text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
        <Target className="h-5 w-5 text-[var(--accent)]" />
        Match Against Job
      </h2>
      <form action={handleMatchForm} className="space-y-4">
        <input type="hidden" name="resume_id" value={selectedResumeId || ""} />
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Selected Resume</label>
          <select value={selectedResumeId || ""} onChange={(e) => setSelectedResumeId(Number(e.target.value))} required
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] font-medium transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none">
            <option value="" disabled>Select a resume below to begin...</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Job Link</label>
            <input name="job_url" type="url" placeholder="https://company.com/job"
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Or Job Description</label>
            <textarea name="job_text" rows={3} placeholder="Paste full JD here..."
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 transition-all duration-200 focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] outline-none" />
          </div>
        </div>
        <button type="submit" disabled={isMatching || !selectedResumeId}
          className="w-full mt-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-[var(--accent-light)] disabled:opacity-50">
          {isMatching ? "Computing Match..." : "Run AI Match Analysis"}
        </button>
      </form>
      
      {isMatching && <LoadingSpinner message="Analyzing alignment..." />}
      {matchError && <div className="mt-4"><ErrorDisplay message={matchError} onRetry={() => setMatchError(null)} /></div>}
    </Card>
  );

  const matchDetailsSection = matchResult ? (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-5 md:grid-cols-2">
        {matchResult.strengths.length > 0 && (
          <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-subtle)]/30 p-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--success)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Core Strengths
            </h4>
            <ul className="space-y-2">
              {matchResult.strengths.map((s,i)=>(
                 <li key={i} className="text-sm text-[var(--muted)] font-medium flex items-start gap-2">
                  <span className="text-[var(--success)] mt-0.5">•</span> <span>{s.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {matchResult.weaknesses.length > 0 && (
          <div className="rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-subtle)]/30 p-4">
            <h4 className="mb-3 text-sm font-bold text-[var(--warning)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Identified Gaps
            </h4>
            <ul className="space-y-2">
              {matchResult.weaknesses.map((w,i)=>(
                <li key={i} className="text-sm text-[var(--muted)] font-medium flex items-start gap-2">
                  <span className="text-[var(--warning)] mt-0.5">•</span> <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {matchResult.recommendations.length > 0 && (
        <Card>
          <h4 className="mb-3 text-sm font-bold text-[var(--accent)] flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Recommended Action Plan
          </h4>
          <ul className="space-y-2">
            {matchResult.recommendations.map((r,i)=>(
              <li key={i} className="text-sm text-[var(--foreground)] font-medium flex items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-3">
                <BookOpen className="h-4 w-4 shrink-0 text-[var(--accent)] mt-0.5" /> <span>{r.title} — <span className="text-[var(--muted)]">{r.platform}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  ) : null;

  const matchScoreSidebar = matchResult ? (
    <Card className="flex flex-col gap-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <Target className="h-4 w-4 text-[var(--accent)]" /> 
          Overall Suitability
        </div>
        <div className="text-5xl font-extrabold text-[var(--accent)] tracking-tighter">
          {matchResult.match_score.toFixed(0)}%
        </div>
      </div>
      {matchResult.ats_score && (
        <div className="rounded-xl bg-[var(--background)] p-3 border border-[var(--card-border)] text-left shadow-sm mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">Estimated ATS Score</div>
          <div className="text-xl font-bold text-[var(--foreground)]">{matchResult.ats_score.score}<span className="text-sm text-[var(--muted)]">/100</span></div>
        </div>
      )}
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isDownloadingPdf}
        className="mt-2 flex w-full justify-center items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-4 py-2.5 text-sm font-bold text-[var(--accent)] transition-all duration-200 hover:bg-[var(--accent)] hover:text-white disabled:opacity-50"
      >
        <FileDown className="h-4 w-4" />
        {isDownloadingPdf ? "Generating PDF..." : "Download Full PDF"}
      </button>
    </Card>
  ) : null;

  if (!matchResult) {
    return (
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-8 space-y-6">
              {uploadSection}
              {activeAnalysisDetails}
           </div>
           <div className="lg:col-span-4 space-y-6">
              {activeAnalysisScore}
              {resumesLibrarySection}
              {matchFormSection}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in-up">
      {/* LEFT COLUMN (Primary Content) */}
      <div className="lg:col-span-8 space-y-6">
        {uploadSection}
        {activeAnalysisDetails}
        {matchDetailsSection}
      </div>
      
      {/* RIGHT COLUMN (Sidebar) */}
      <div className="lg:col-span-4 space-y-6">
        {matchScoreSidebar}
        {activeAnalysisScore}
        {resumesLibrarySection}
        {matchFormSection}
      </div>
    </div>
  );
}
