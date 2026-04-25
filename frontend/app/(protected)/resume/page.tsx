import ResumeUploader from "@/components/resume/ResumeUploader";
import { listResumesSSR } from "@/lib/api-server";

import { ResumeListItem } from "@/lib/types";

export const metadata = {
  title: "Resume Analysis - JobShield AI",
  description: "Upload your resume for skill extraction, ATS scoring, and intelligent job matching.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResumePage() {
  // Fetch the list of resumes securely on the server
  let initialResumes: ResumeListItem[] = [];
  let fetchError: string | null = null;

  try {
    const data = await listResumesSSR();
    initialResumes = data.resumes;
    console.log(`[DEBUG ResumePage] Fetched ${initialResumes.length} resumes successfully`);
  } catch (error: any) {
    // DO NOT silently return [] — surface the error so it's visible
    console.error("[ERROR ResumePage] Resume fetch FAILED:", error.message);
    fetchError = error.message || "Failed to load resumes";
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header (Server Rendered) */}
      <div className="mb-8 animate-fade-in text-center lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Smart Matching
        </div>
        <h1 className="mb-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--foreground)]">Resume Analysis</h1>
        <p className="text-[var(--muted)] text-sm lg:text-base">Upload your resume for skill extraction, ATS scoring, and intelligent job matching.</p>
      </div>

      {/* Server-side fetch error banner */}
      {fetchError && (
        <div className="mb-6 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-sm text-[var(--danger)] font-medium">
          ⚠️ Could not load your resumes: {fetchError}
        </div>
      )}

      {/* Interactive Island receiving server-fetched resume list */}
      <ResumeUploader initialResumes={initialResumes} />
    </div>
  );
}

