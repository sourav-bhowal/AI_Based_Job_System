"use server";

import { scanUrlSSR, scanTextSSR, generateScanPdfSSR } from "@/lib/api-server";
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
    const data = await scanUrlSSR(url) as any;
    if (data && data.success === false) {
      if (data.error === "SCRAPE_FAILED") {
        return { success: false, error: "SCRAPE_FAILED" };
      }
      return { success: false, error: data.message || data.error || "Failed to parse job from URL" };
    }
    return { success: true, data };
  } catch (error: any) {
    let msg = error.message || "Failed to scan URL";
    if (msg.includes("Playwright") || msg.toLowerCase().includes("unable to fetch") || msg.includes("Timeout")) {
      return { success: false, error: "SCRAPE_FAILED" };
    }
    return { success: false, error: msg };
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

export async function downloadScanPdfAction(url: string) {
  try {
    const data = await generateScanPdfSSR(url);
    return { success: true, downloadUrl: data.download_url };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate PDF" };
  }
}
