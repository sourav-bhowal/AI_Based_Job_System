"use server";

import { serverFetch } from "@/lib/api-server";

export async function createReportAction(
  prevState: any,
  formData: FormData
) {
  const company_name = formData.get("company_name") as string;
  const description = formData.get("description") as string;
  const job_url = formData.get("job_url") as string | null;
  const job_title = formData.get("job_title") as string | null;
  const evidence = formData.get("evidence") as string | null;
  const category = formData.get("category") as string || "other";

  if (!company_name || !description) {
    return { success: false, error: "Company name and description are required" };
  }

  try {
    const data = await serverFetch("/api/reports/create", {
      method: "POST",
      body: formData,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit report" };
  }
}

export async function voteReportAction(reportId: number, voteType: "up" | "down") {
  try {
    const data = await serverFetch(`/api/reports/${reportId}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote_type: voteType }),
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to register vote" };
  }
}

export async function getReportsAction(page: number = 1, perPage: number = 20) {
  try {
    const data = await serverFetch(`/api/reports?page=${page}&per_page=${perPage}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch reports" };
  }
}

export async function getBlacklistAction() {
  try {
    const data = await serverFetch(`/api/reports/blacklist`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch blacklist" };
  }
}

