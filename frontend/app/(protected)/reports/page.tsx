import { getReportsSSR, getBlacklistSSR } from "@/lib/api-server";
import ReportsClient from "./ReportsClient";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [reportsResult, blacklistResult] = await Promise.allSettled([
    getReportsSSR(1, 20),
    getBlacklistSSR(),
  ]);

  const initialReports = reportsResult.status === "fulfilled" ? reportsResult.value.reports : [];
  const initialTotalPages = reportsResult.status === "fulfilled" ? reportsResult.value.total_pages : 1;
  const initialBlacklist = blacklistResult.status === "fulfilled" ? blacklistResult.value.blacklist : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/10">
          <ShieldAlert className="h-4 w-4" />
          Crowdsourced Safety
        </div>
        <h1 className="mb-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--foreground)]">Community Reports</h1>
        <p className="text-[var(--muted)] text-sm lg:text-base">Browse, submit, and vote on scam reports to help protect job seekers.</p>
      </div>

      <ReportsClient
        initialReports={initialReports}
        initialTotalPages={initialTotalPages}
        initialBlacklist={initialBlacklist}
      />
    </div>
  );
}
