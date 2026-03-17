import type {
  ScanHistoryItem,
  AIDetectionResult,
  ResumeListItem,
  MatchHistoryItem,
  ScamReport,
  ReportsResponse,
  BlacklistItem,
  AnalyticsOverview,
  TrendItem,
  TopReportedCompany,
  ModelComparison,
  ReportCategory,
  HealthCheck,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ========== Core Client ==========

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(
      typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail),
      res.status
    );
  }

  // Handle PDF / binary responses
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/pdf")) {
    return (await res.blob()) as unknown as T;
  }

  return res.json();
}

// ========== Auth ==========

export async function getMe() {
  return apiClient<{
    user_id: number;
    username: string;
    email: string;
    full_name: string | null;
    created_at: string;
    is_admin: number;
  }>("/api/auth/me");
}

// ========== Job Scanning ==========

export async function getScanHistory(): Promise<{
  history: ScanHistoryItem[];
}> {
  return apiClient("/api/scan/history");
}

export async function detectAI(
  text: string,
  job_title?: string,
  company_name?: string
): Promise<AIDetectionResult> {
  return apiClient<AIDetectionResult>("/api/scan/detect-ai", {
    method: "POST",
    body: JSON.stringify({ text, job_title, company_name }),
  });
}

// ========== Resume ==========

export async function listResumes(): Promise<{
  resumes: ResumeListItem[];
}> {
  return apiClient("/api/resume/list");
}



export async function getMatchHistory(): Promise<{
  history: MatchHistoryItem[];
}> {
  return apiClient("/api/resume/match-history");
}

// ========== Company Reputation ==========

// ========== Community Reports ==========

export async function createReport(data: {
  company_name: string;
  description: string;
  job_url?: string;
  job_title?: string;
  evidence?: string;
  category?: string;
}): Promise<{ report_id: number; message: string }> {
  return apiClient("/api/reports/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getReports(
  page = 1,
  per_page = 20,
  category?: string
): Promise<ReportsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });
  if (category) params.set("category", category);
  return apiClient(`/api/reports?${params}`);
}

export async function voteReport(
  report_id: number,
  vote_type: "up" | "down"
): Promise<{ message: string; action: string }> {
  return apiClient(`/api/reports/${report_id}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote_type }),
  });
}

export async function getBlacklist(): Promise<{
  blacklist: BlacklistItem[];
}> {
  return apiClient("/api/reports/blacklist");
}

// ========== Analytics ==========

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiClient("/api/analytics/overview");
}

export async function getTrends(
  days = 30
): Promise<{ trends: TrendItem[] }> {
  return apiClient(`/api/analytics/trends?days=${days}`);
}

export async function getTopReported(
  limit = 10
): Promise<{ companies: TopReportedCompany[] }> {
  return apiClient(`/api/analytics/top-reported?limit=${limit}`);
}

export async function getModelComparison(): Promise<ModelComparison> {
  return apiClient("/api/analytics/models");
}

export async function getRecentScans(limit = 20) {
  return apiClient<{
    scans: {
      id: number;
      user_id: number;
      username: string;
      url: string;
      risk_score: number;
      risk_level: string;
      scanned_at: string;
    }[];
  }>(`/api/analytics/recent-scans?limit=${limit}`);
}

export async function getReportCategories(): Promise<{
  categories: ReportCategory[];
}> {
  return apiClient("/api/analytics/report-categories");
}

// ========== PDF Reports ==========

export async function generateScanPDF(url: string): Promise<Blob> {
  return apiClient<Blob>("/api/reports/generate-scan-pdf", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function generateMatchPDF(
  resume_id: number,
  job_url?: string,
  job_text?: string
): Promise<Blob> {
  return apiClient<Blob>("/api/reports/generate-match-pdf", {
    method: "POST",
    body: JSON.stringify({ resume_id, job_url, job_text }),
  });
}

// ========== System ==========

export async function healthCheck(): Promise<HealthCheck> {
  return apiClient("/api/health");
}

export { ApiError };
