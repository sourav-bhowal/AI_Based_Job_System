import {
  getAnalyticsOverviewSSR,
  getTrendsSSR,
  getTopReportedSSR,
  getModelComparisonSSR,
  getReportCategoriesSSR,
} from "@/lib/api-server";
import type {
  AnalyticsOverview,
  TrendItem,
  TopReportedCompany,
  ModelComparison,
  ReportCategory,
} from "@/lib/types";
import Card from "@/components/Card";
import { Users, Search, AlertOctagon, FileText, Ban, TrendingUp, Calendar, AlertTriangle, Building2, Server, BrainCircuit, Activity } from "lucide-react";

export default async function AnalyticsPage() {
  const results = await Promise.allSettled([
    getAnalyticsOverviewSSR(),
    getTrendsSSR(30),
    getTopReportedSSR(10),
    getModelComparisonSSR(),
    getReportCategoriesSSR(),
  ]);

  const overview: AnalyticsOverview | null = results[0].status === "fulfilled" ? results[0].value : null;
  const trends: TrendItem[] = results[1].status === "fulfilled" ? results[1].value.trends : [];
  const topReported: TopReportedCompany[] = results[2].status === "fulfilled" ? results[2].value.companies : [];
  const models: ModelComparison | null = results[3].status === "fulfilled" ? results[3].value : null;
  const categories: ReportCategory[] = results[4].status === "fulfilled" ? results[4].value.categories : [];

  const statCards = overview
    ? [
        { label: "Total Users", value: overview.total_users, icon: Users, color: "var(--accent)" },
        { label: "Total Scans", value: overview.total_scans, icon: Search, color: "var(--accent)" },
        { label: "Scam Reports", value: overview.total_reports, icon: AlertOctagon, color: "var(--warning)" },
        { label: "Resumes Match", value: overview.total_resumes, icon: FileText, color: "var(--success)" },
        { label: "Blacklisted", value: overview.blacklisted_companies, icon: Ban, color: "var(--danger)" },
        { label: "Risk Average", value: overview.average_risk_score.toFixed(1), icon: TrendingUp, color: "var(--warning)" },
        { label: "Scans Today", value: overview.scans_today, icon: Calendar, color: "var(--accent)" },
        { label: "Critical Risk", value: overview.risk_distribution.high_risk, icon: AlertTriangle, color: "var(--danger)" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/10">
          <Activity className="h-4 w-4" />
          Platform Insights
        </div>
        <h1 className="mb-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--foreground)]">Analytics Dashboard</h1>
        <p className="text-[var(--muted)] text-sm lg:text-base">Platform usage statistics, threat trends, and ML model performance metrics.</p>
      </div>

      {/* Stats Grid */}
      {overview && (
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)] hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms`, borderBottom: `4px solid ${item.color}` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-3xl font-extrabold tracking-tighter text-[var(--foreground)]">{item.value}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{item.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Layout Grid Composition */}
      <div className="space-y-6">
        
        {/* Middle Row: Trends (8) + Risk Distribution (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {trends.length > 0 && (
              <Card className="p-0 overflow-hidden h-full">
                <div className="p-5 border-b border-[var(--card-border)] bg-[var(--background)]">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[var(--accent)]" /> 30-Day Platform Activity
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--card)]/50">
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Date</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Scans Completed</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Daily Avg Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trends.slice(0, 8).map((t, idx) => (
                        <tr key={t.date} className={`border-t border-[var(--card-border)]/50 transition-colors hover:bg-[var(--accent-subtle)]/30 ${idx % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--background)]"}`}>
                          <td className="px-5 py-3 font-semibold text-[var(--foreground)]">{t.date}</td>
                          <td className="px-5 py-3 text-right font-bold text-[var(--muted)]">{t.count.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-extrabold shadow-sm border ${
                              t.avg_risk_score > 70 ? "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger)]/20" : 
                              t.avg_risk_score > 40 ? "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]/20" : 
                              "bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]/20"
                            }`}>
                              {t.avg_risk_score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4">
            {overview && (
              <Card className="h-full">
                <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                   <AlertTriangle className="h-4 w-4 text-[var(--warning)]" /> Risk Distribution
                </h2>
                <div className="flex flex-col gap-5">
                  {[
                    { label: "Safe", count: overview.risk_distribution.safe, color: "var(--success)" },
                    { label: "Medium Risk", count: overview.risk_distribution.medium_risk, color: "var(--warning)" },
                    { label: "High Risk", count: overview.risk_distribution.high_risk, color: "var(--danger)" },
                  ].map((r) => {
                    const total = overview.risk_distribution.safe + overview.risk_distribution.medium_risk + overview.risk_distribution.high_risk;
                    const pct = total > 0 ? (r.count / total * 100) : 0;
                    return (
                      <div key={r.label} className="flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--foreground)]">{r.label}</span>
                          <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-[var(--muted)]">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--card-border)]/50 overflow-hidden">
                          <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: r.color }} />
                        </div>
                        <div className="mt-1.5 text-[10px] font-semibold text-[var(--muted)] tracking-wide">{r.count.toLocaleString()} scans</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Full Width Row: Report Categorization */}
        {categories.length > 0 && (
          <Card padding="md">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
              <Server className="h-4 w-4 text-[var(--accent)]" /> Report Categorization
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((c, i) => (
                <div key={i} className="flex flex-col items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 shadow-sm text-center">
                  <span className="rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/10 px-3 py-1 text-lg font-extrabold text-[var(--accent)] mb-2">{c.count}</span>
                  <span className="font-semibold text-[var(--muted)] text-xs capitalize leading-tight">
                    {c.category.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Bottom Row: Models (8) + Top Reported (4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {models?.models && (
              <Card className="p-0 overflow-hidden h-full">
                <div className="p-5 border-b border-[var(--card-border)] bg-[var(--background)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-[var(--accent)]" /> Machine Learning Pipeline
                  </h2>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)] bg-[var(--success-subtle)] px-2 py-1 rounded-md border border-[var(--success)]/20">
                    Active: <span className="font-extrabold text-[var(--success)]">{models.best_model || models.models.reduce((prev, current) => (prev.f1_score > current.f1_score) ? prev : current).model_name}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--card)]/50">
                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Model Artifact</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Accuracy</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Precision</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">F1 Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.models.map((m, idx) => {
                        const bestModelName = models.best_model || models.models.reduce((prev, current) => (prev.f1_score > current.f1_score) ? prev : current).model_name;
                        const isBest = m.model_name === bestModelName;
                        return (
                          <tr key={m.model_name} className={`border-t border-[var(--card-border)]/50 transition-colors ${
                            isBest ? "bg-[var(--success-subtle)]/30 backdrop-blur-sm" : idx % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--background)]"
                          }`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isBest ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>{m.model_name}</span>
                                {isBest && <span className="rounded bg-[var(--success)] px-1.5 py-0.5 text-[8px] font-bold uppercase text-white tracking-widest leading-none">Best</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-[var(--muted)]">{m.accuracy.toFixed(2)}%</td>
                            <td className="px-5 py-3 text-right font-medium text-[var(--muted)]">{m.precision.toFixed(2)}%</td>
                            <td className="px-5 py-3 text-right font-bold text-[var(--foreground)]">{m.f1_score.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4">
            {topReported.length > 0 && (
              <Card padding="md" className="h-full">
                <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                  <Building2 className="h-4 w-4 text-[var(--danger)]" /> Top Investigated
                </h2>
                <div className="space-y-3">
                  {topReported.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 transition-all hover:border-[var(--danger)]/30 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--card-border)]/50 text-[10px] font-bold text-[var(--muted)]">{i + 1}</span>
                        <span className="font-bold text-[var(--foreground)] text-sm truncate max-w-[120px]">{c.company_name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-base font-extrabold text-[var(--danger)]">{c.report_count}</span>
                        <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--muted)]">Reports</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

      </div>

      {/* No Data Fallback */}
      {!overview && trends.length === 0 && topReported.length === 0 && !models && categories.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card)]/50">
          <Activity className="h-12 w-12 text-[var(--muted)]/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No Platform Analytics Available</h3>
          <p className="text-[var(--muted)]">
            Connect to the backend cluster at <code className="text-xs bg-[var(--background)] px-2 py-1 rounded font-mono border border-[var(--card-border)]">{process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</code>
          </p>
        </div>
      )}
    </div>
  );
}
