"use server";

import { checkCompanySSR } from "@/lib/api-server";
import { CompanyCheckResult } from "@/lib/types";

export type CompanyActionState = 
  | { success: false; error: string; data?: null }
  | { success: true; error?: null; data: CompanyCheckResult }
  | null;

export async function checkCompanyAction(
  prevState: CompanyActionState,
  formData: FormData
): Promise<CompanyActionState> {
  const companyName = formData.get("company_name") as string;
  const domain = formData.get("domain") as string;
  const email = formData.get("email") as string;
  
  try {
    const data = await checkCompanySSR(companyName, domain || undefined, email || undefined);
    return { success: true, data };
  } catch (error: any) {
    let msg = error.message;
    if (msg?.includes("Failed to fetch") || msg?.includes("fetch failed")) {
      msg = "Cannot connect to backend server. Please ensure the API is running.";
    } else if (msg?.includes("timeout") || msg?.includes("Timeout")) {
      msg = "The company verification timed out. Deep scans can sometimes take 30-60s. Please try again.";
    } else if (msg?.includes("422") || msg?.includes("Validation")) {
      msg = "Invalid company details provided.";
    } else if (msg?.includes("401") || msg?.includes("Unauthorized") || msg?.includes("Not authenticated")) {
      msg = "Your session expired. Please log in again.";
    } else {
      msg = msg || "Failed to verify the company. An internal issue occurred.";
    }
    
    return { success: false, error: msg };
  }
}
