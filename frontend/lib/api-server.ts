import type {
  AuthResponse,
  ScanResult,
  CompanyCheckResult,
  ResumeListItem,
  ResumeUploadResult,
  MatchResult,
  AnalyticsOverview,
  TrendItem,
  TopReportedCompany,
  ModelComparison,
  ReportCategory,
  ReportsResponse,
  BlacklistItem,
  HealthCheck,
} from "./types";

/**
 * Server-side API client for public endpoints.
 * Used in React Server Components — no localStorage access needed.
 */

import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function serverFetch<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  const headers = new Headers(options?.headers);
  const isFormData = options?.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let detail = res.statusText;
    try {
      const parsed = JSON.parse(errorBody);
      detail = parsed.detail || detail;
    } catch { }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  // Handle PDF / binary responses
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/pdf")) {
    return (await res.blob()) as unknown as T;
  }

  return res.json();
}

// ========== Auth / Session ==========

export async function registerUserSSR(
  username: string,
  email: string,
  password: string,
  full_name?: string
): Promise<AuthResponse> {
  return serverFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password, full_name }),
  });
}

export async function loginUserSSR(
  username: string,
  password: string
): Promise<AuthResponse> {
  return serverFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe() {
  return serverFetch<{
    user_id: number;
    username: string;
    email: string;
    full_name: string | null;
    created_at: string;
    is_admin: number;
  }>("/api/auth/me");
}

// ========== Scanner ==========

export async function scanUrlSSR(url: string): Promise<ScanResult> {
  return serverFetch<ScanResult>("/api/scan/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function scanTextSSR(
  text: string,
  job_title?: string,
  company_name?: string
): Promise<ScanResult> {
  return serverFetch<ScanResult>("/api/scan/text", {
    method: "POST",
    body: JSON.stringify({ text, job_title, company_name }),
  });
}

export async function checkCompanySSR(
  company_name: string,
  domain?: string,
  email?: string
): Promise<CompanyCheckResult> {
  return serverFetch<CompanyCheckResult>("/api/company/check", {
    method: "POST",
    body: JSON.stringify({ company_name, domain, email }),
  });
}

// ========== Resume ==========

export async function listResumesSSR(): Promise<{ resumes: ResumeListItem[] }> {
  return serverFetch("/api/resume/list");
}

export async function uploadResumeSSR(file: File): Promise<ResumeUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return serverFetch<ResumeUploadResult>("/api/resume/upload", {
    method: "POST",
    body: formData as any,
  });
}

export async function matchResumeSSR(
  resume_id: number,
  job_url?: string,
  job_text?: string
): Promise<MatchResult> {
  return serverFetch<MatchResult>("/api/resume/match", {
    method: "POST",
    body: JSON.stringify({ resume_id, job_url, job_text }),
  });
}

// ========== Company ==========

export async function getAnalyticsOverviewSSR(): Promise<AnalyticsOverview> {
  return serverFetch("/api/analytics/overview");
}

export async function getTrendsSSR(
  days = 30
): Promise<{ trends: TrendItem[] }> {
  return serverFetch(`/api/analytics/trends?days=${days}`);
}

export async function getTopReportedSSR(
  limit = 10
): Promise<{ companies: TopReportedCompany[] }> {
  return serverFetch(`/api/analytics/top-reported?limit=${limit}`);
}

export async function getModelComparisonSSR(): Promise<ModelComparison> {
  return serverFetch("/api/analytics/models");
}

export async function getReportCategoriesSSR(): Promise<{
  categories: ReportCategory[];
}> {
  return serverFetch("/api/analytics/report-categories");
}

// ========== Community Reports (public read endpoints) ==========

export async function getReportsSSR(
  page = 1,
  per_page = 20,
  category?: string
): Promise<ReportsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(per_page),
  });
  if (category) params.set("category", category);
  return serverFetch(`/api/reports?${params}`);
}

export async function getBlacklistSSR(): Promise<{
  blacklist: BlacklistItem[];
}> {
  return serverFetch("/api/reports/blacklist");
}

// ========== PDF Reports ==========

export async function generateScanPdfSSR(url: string): Promise<{ download_url: string, s3_url: string }> {
  return serverFetch<{ download_url: string, s3_url: string }>("/api/reports/generate-scan-pdf", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function generateMatchPdfSSR(
  resume_id: number,
  job_url?: string,
  job_text?: string
): Promise<{ download_url: string, s3_url: string }> {
  return serverFetch<{ download_url: string, s3_url: string }>("/api/reports/generate-match-pdf", {
    method: "POST",
    body: JSON.stringify({ resume_id, job_url, job_text }),
  });
}

// ========== System ==========

export async function healthCheckSSR(): Promise<HealthCheck> {
  return serverFetch("/api/health");
}
