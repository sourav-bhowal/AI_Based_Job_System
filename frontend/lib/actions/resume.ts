"use server";

import { uploadResumeSSR, matchResumeSSR, generateMatchPdfSSR } from "@/lib/api-server";
import { ResumeUploadResult, MatchResult } from "@/lib/types";

export type UploadActionState = 
  | { success: false; error: string; data?: null }
  | { success: true; error?: null; data: ResumeUploadResult }
  | null;

export async function uploadResumeAction(
  prevState: UploadActionState,
  formData: FormData
): Promise<UploadActionState> {
  const file = formData.get("file") as File;
  
  if (!file || file.size === 0) {
    return { success: false, error: "Please provide a valid file." };
  }

  try {
    const data = await uploadResumeSSR(file);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to upload resume" };
  }
}

export type MatchActionState = 
  | { success: false; error: string; data?: null }
  | { success: true; error?: null; data: MatchResult }
  | null;

export async function matchResumeAction(
  prevState: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const resumeId = Number(formData.get("resume_id"));
  const jobUrl = formData.get("job_url") as string;
  const jobText = formData.get("job_text") as string;
  
  if (!resumeId) {
    return { success: false, error: "Please select a resume." };
  }

  try {
    const data = await matchResumeSSR(resumeId, jobUrl || undefined, jobText || undefined);
    return { success: true, data };
  } catch (error: any) {
    let msg = error.message || "Failed to match resume";
    if (msg.includes("Playwright") || msg.toLowerCase().includes("unable to fetch") || msg.includes("Timeout")) {
      msg = "Scraping blocked by the host site (e.g., LinkedIn). Please paste the job text manually.";
    }
    return { success: false, error: msg };
  }
}

export async function downloadMatchPdfAction(
  resumeId: number,
  jobUrl?: string,
  jobText?: string
) {
  try {
    const blob = await generateMatchPdfSSR(resumeId, jobUrl, jobText);
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { success: true, pdfBase64: base64 };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate PDF" };
  }
}
