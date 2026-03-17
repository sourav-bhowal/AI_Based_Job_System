"use server";

import { scanUrlSSR, scanTextSSR } from "@/lib/api-server";
import { ScanResult } from "@/lib/types";

export type ScanActionState = 
  | { success: false; error: string; data?: null }
  | { success: true; error?: null; data: ScanResult }
  | null;

export async function scanUrlAction(
  prevState: ScanActionState,
  formData: FormData
): Promise<ScanActionState> {
  const url = formData.get("scan-url") as string;
  
  try {
    const data = await scanUrlSSR(url);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to scan URL" };
  }
}

export async function scanTextAction(
  prevState: ScanActionState,
  formData: FormData
): Promise<ScanActionState> {
  const text = formData.get("scan-text") as string;
  const jobTitle = formData.get("job-title") as string;
  const companyName = formData.get("company-name") as string;
  
  try {
    const data = await scanTextSSR(text, jobTitle || undefined, companyName || undefined);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to scan text" };
  }
}
