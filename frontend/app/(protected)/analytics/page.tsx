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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <Activity className="h-4 w-4" />
          Platform Insights
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Analytics Dashboard</h1>
        <p className="text-[var(--muted)]">Platform usage statistics, threat trends, and ML model performance metrics.</p>
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

      {/* Risk Distribution */}
      {overview && (
        <Card className="mb-8">
          <h2 className="mb-5 text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-[var(--warning)]" /> Risk Assessment Distribution
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
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
                    <span className="text-sm font-semibold text-[var(--foreground)]">{r.label}</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)]">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3.5 rounded-full bg-[var(--card-border)]/50 overflow-hidden">
                    <div className="h-3.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: r.color }} />
                  </div>
                  <div className="mt-2 text-xs font-medium text-[var(--muted)]">{r.count.toLocaleString()} scans</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <Card className="mb-8 p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--card-border)] bg-[var(--background)]">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--accent)]" /> 30-Day Platform Activity
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card)]/50">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Scans Completed</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Daily Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 14).map((t, idx) => (
                  <tr key={t.date} className={`border-t border-[var(--card-border)]/50 transition-colors hover:bg-[var(--accent-subtle)]/30 ${idx % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--background)]"}`}>
                    <td className="px-6 py-4 font-medium text-[var(--foreground)]">{t.date}</td>
                    <td className="px-6 py-4 text-right font-semibold">{t.count.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm border ${
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Reported */}
        {topReported.length > 0 && (
          <Card padding="md">
            <h2 className="mb-5 text-lg font-bold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
              <Building2 className="h-5 w-5 text-[var(--danger)]" /> Top Investigated
            </h2>
            <div className="space-y-3">
              {topReported.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3.5 transition-all hover:border-[var(--danger)]/30 hover:shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--card-border)]/50 text-sm font-bold text-[var(--muted)]">{i + 1}</span>
                    <span className="font-bold text-[var(--foreground)] text-base">{c.company_name}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-extrabold text-[var(--danger)]">{c.report_count}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--muted)]">Reports</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <Card padding="md">
            <h2 className="mb-5 text-lg font-bold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
              <Server className="h-5 w-5 text-[var(--accent)]" /> Report Categorization
            </h2>
            <div className="space-y-3">
              {categories.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3.5">
                  <span className="font-semibold text-[var(--foreground)] capitalize flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    {c.category.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/10 px-3 py-1 text-sm font-bold text-[var(--accent)]">{c.count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Model Comparison */}
      {models?.models && (
        <Card className="mt-8 p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--card-border)] bg-[var(--background)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[var(--accent)]" /> Machine Learning Pipeline
            </h2>
            <div className="text-sm font-medium text-[var(--muted)] bg-[var(--success-subtle)] px-3 py-1.5 rounded-lg border border-[var(--success)]/20">
              Active Primary: <span className="font-bold text-[var(--success)]">{models.best_model}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card)]/50">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Model Artifact</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Accuracy</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Precision</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Recall</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--muted)]">F1 Score</th>
                </tr>
              </thead>
              <tbody>
                {models.models.map((m, idx) => {
                  const isBest = m.model_name === models.best_model;
                  return (
                    <tr key={m.model_name} className={`border-t border-[var(--card-border)]/50 transition-colors ${
                      isBest ? "bg-[var(--success-subtle)]/30 backdrop-blur-sm" : idx % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--background)]"
                    }`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isBest ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>{m.model_name}</span>
                          {isBest && <span className="rounded bg-[var(--success)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white tracking-widest leading-none">Best</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{m.accuracy.toFixed(2)}%</td>
                      <td className="px-6 py-4 text-right font-medium">{m.precision.toFixed(2)}%</td>
                      <td className="px-6 py-4 text-right font-medium">{m.recall.toFixed(2)}%</td>
                      <td className="px-6 py-4 text-right font-bold text-[var(--foreground)]">{m.f1_score.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
