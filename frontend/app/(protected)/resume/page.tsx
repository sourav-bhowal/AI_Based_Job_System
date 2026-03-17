import ResumeUploader from "@/components/resume/ResumeUploader";
import { listResumesSSR } from "@/lib/api-server";

import { ResumeListItem } from "@/lib/types";

export const metadata = {
  title: "Resume Analysis - JobShield AI",
  description: "Upload your resume for skill extraction, ATS scoring, and intelligent job matching.",
};

export default async function ResumePage() {
  // Fetch the list of resumes securely on the server
  let initialResumes: ResumeListItem[] = [];
  try {
    const data = await listResumesSSR();
    initialResumes = data.resumes;
  } catch (error) {
    // Graceful fallback if user has no resumes or unauthorized
    initialResumes = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header (Server Rendered) */}
      <div className="mb-8 animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Smart Matching
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Resume Analysis</h1>
        <p className="text-[var(--muted)]">Upload your resume for skill extraction, ATS scoring, and intelligent job matching.</p>
      </div>

      {/* Interactive Island receiving server-fetched resume list */}
      <ResumeUploader initialResumes={initialResumes} />
    </div>
  );
}
