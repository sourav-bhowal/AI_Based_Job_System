import Link from "next/link";
import { Search, FileText, Building2, ShieldAlert, BarChart3, Brain, Target, Activity, Unlock } from "lucide-react";

const features = [
  {
    href: "/scanner",
    icon: Search,
    title: "Job Scam Scanner",
    description: "Multi-model ML analysis, explainable AI, and salary anomaly detection to expose fraudulent job postings.",
    tag: "AI-Powered",
  },
  {
    href: "/resume",
    icon: FileText,
    title: "Resume Analysis",
    description: "Upload your resume for skill extraction, ATS scoring, and intelligent job-matching with training roadmaps.",
    tag: "Smart Match",
  },
  {
    href: "/company",
    icon: Building2,
    title: "Company Reputation",
    description: "Domain age, email verification, social presence, and community data to verify company trustworthiness.",
    tag: "Trust Score",
  },
  {
    href: "/reports",
    icon: ShieldAlert,
    title: "Community Reports",
    description: "Crowdsourced scam reports with voting, categories, and auto-blacklisting of repeat offenders.",
    tag: "Crowdsourced",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Platform-wide stats, scan trends, risk distributions, and ML model performance comparison.",
    tag: "Insights",
  },
];

const stats = [
  { label: "ML Models", value: "5+", icon: Brain },
  { label: "Detection Rate", value: "95%+", icon: Target },
  { label: "Analysis Points", value: "30+", icon: Activity },
  { label: "Open Source", value: "100%", icon: Unlock },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient & Dot Grid */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-subtle)] via-[var(--background)] to-[var(--background)] opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(var(--muted)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15] [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[var(--accent)]/10 blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
        </div>

        <div className="mx-auto max-w-5xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24">
          <div className="text-center animate-fade-in-up">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-4 py-1.5 text-sm font-medium text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              AI-Powered Job Safety Platform
            </div>

            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-7xl">
              Protect Yourself from{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] bg-clip-text text-transparent">
                Job Scams
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
              Scan job postings, analyze resumes, verify companies, and join a
              community fighting employment fraud — all powered by machine
              learning and explainable AI.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/scanner"
                className="group flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
              >
                Scan a Job Posting
                <Search className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:bg-[var(--accent-subtle)]/50"
              >
                Create Free Account
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-in delay-300">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 text-center shadow-[var(--shadow-sm)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--accent)]/20"
                >
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</div>
                  <div className="mt-1 text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Everything You Need to Stay Safe
          </h2>
          <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
            A comprehensive toolkit for detecting scams, analyzing opportunities, and protecting job seekers.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className={`group relative flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1 hover:border-[var(--accent)]/30 animate-fade-in`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                    {feature.tag}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-[var(--foreground)]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted)] flex-1">
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
