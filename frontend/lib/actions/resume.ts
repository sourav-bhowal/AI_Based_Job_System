"use server";

import { uploadResumeSSR, matchResumeSSR } from "@/lib/api-server";
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
    return { success: false, error: error.message || "Failed to match resume" };
  }
}
