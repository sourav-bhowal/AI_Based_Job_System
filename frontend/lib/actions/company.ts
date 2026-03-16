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
    return { success: false, error: error.message || "Failed to check company" };
  }
}
