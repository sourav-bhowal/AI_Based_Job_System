import { getReportsSSR, getBlacklistSSR } from "@/lib/api-server";
import ReportsClient from "./ReportsClient";
import { ShieldAlert } from "lucide-react";

export default async function ReportsPage() {
  const [reportsResult, blacklistResult] = await Promise.allSettled([
    getReportsSSR(1, 20),
    getBlacklistSSR(),
  ]);

  const initialReports = reportsResult.status === "fulfilled" ? reportsResult.value.reports : [];
  const initialTotalPages = reportsResult.status === "fulfilled" ? reportsResult.value.total_pages : 1;
  const initialBlacklist = blacklistResult.status === "fulfilled" ? blacklistResult.value.blacklist : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <ShieldAlert className="h-4 w-4" />
          Crowdsourced Safety
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Community Reports</h1>
        <p className="text-[var(--muted)]">Browse, submit, and vote on scam reports to help protect job seekers.</p>
      </div>

      <ReportsClient
        initialReports={initialReports}
        initialTotalPages={initialTotalPages}
        initialBlacklist={initialBlacklist}
      />
    </div>
  );
}
