import Link from "next/link";
import Image from "next/image";
import { Search, FileText, Building2, ShieldAlert, BarChart3, Brain, Target, Activity, Unlock, ShieldCheck, ArrowRight, Link as LinkIcon, Bell } from "lucide-react";
import { cookies } from "next/headers";

const features = [
  {
    href: "/scanner",
    icon: Search,
    title: "Job Scam Scanner",
    description: "Multi-model ML analysis, explainable AI, and salary anomaly detection to expose fraudulent job postings.",
    tag: "AI-Powered",
    accent: "blue",
    primary: true,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400 dark:text-blue-400",
    borderColor: "border-blue-500/30 dark:border-blue-500/40",
    hoverBorder: "hover:border-blue-400/50",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/25",
    tagText: "text-blue-600 dark:text-blue-400",
    glowColor: "hover:shadow-blue-500/10",
  },
  {
    href: "/resume",
    icon: FileText,
    title: "Resume Analysis",
    description: "Upload your resume for skill extraction, ATS scoring, and intelligent job-matching with training roadmaps.",
    tag: "Smart Match",
    accent: "emerald",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    borderColor: "border-emerald-500/20 dark:border-emerald-500/20",
    hoverBorder: "hover:border-emerald-400/40",
    tagBg: "bg-emerald-500/10",
    tagBorder: "border-emerald-500/25",
    tagText: "text-emerald-600 dark:text-emerald-400",
    glowColor: "hover:shadow-emerald-500/10",
  },
  {
    href: "/company",
    icon: Building2,
    title: "Company Reputation",
    description: "Domain age, email verification, social presence, and community data to verify company trustworthiness.",
    tag: "Trust Score",
    accent: "amber",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500 dark:text-amber-400",
    borderColor: "border-amber-500/20 dark:border-amber-500/20",
    hoverBorder: "hover:border-amber-400/40",
    tagBg: "bg-amber-500/10",
    tagBorder: "border-amber-500/25",
    tagText: "text-amber-600 dark:text-amber-400",
    glowColor: "hover:shadow-amber-500/10",
  },
  {
    href: "/reports",
    icon: ShieldAlert,
    title: "Community Reports",
    description: "Crowdsourced scam reports with voting, categories, and auto-blacklisting of repeat offenders.",
    tag: "Crowdsourced",
    accent: "rose",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-500 dark:text-rose-400",
    borderColor: "border-rose-500/20 dark:border-rose-500/20",
    hoverBorder: "hover:border-rose-400/40",
    tagBg: "bg-rose-500/10",
    tagBorder: "border-rose-500/25",
    tagText: "text-rose-600 dark:text-rose-400",
    glowColor: "hover:shadow-rose-500/10",
  },
  {
    href: "/analytics",
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Platform-wide stats, scan trends, risk distributions, and ML model performance comparison.",
    tag: "Insights",
    accent: "violet",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-500 dark:text-violet-400",
    borderColor: "border-violet-500/20 dark:border-violet-500/20",
    hoverBorder: "hover:border-violet-400/40",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/25",
    tagText: "text-violet-600 dark:text-violet-400",
    glowColor: "hover:shadow-violet-500/10",
  },
];

const stats = [
  { label: "ML Models", value: "5+", icon: Brain, iconBg: "bg-blue-500/10", iconColor: "text-blue-500 dark:text-blue-400" },
  { label: "Detection Rate", value: "95%+", icon: Target, iconBg: "bg-green-500/10", iconColor: "text-green-500 dark:text-green-400" },
  { label: "Analysis Points", value: "30+", icon: Activity, iconBg: "bg-yellow-500/10", iconColor: "text-yellow-500 dark:text-yellow-400" },
  { label: "Open Source", value: "100%", icon: Unlock, iconBg: "bg-purple-500/10", iconColor: "text-purple-500 dark:text-purple-400" },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("auth_token")?.value;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[var(--hero-bg-from)] via-[var(--hero-bg-via)] to-[var(--hero-bg-to)] selection:bg-[var(--accent)]/30 overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-slowest {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />

      {/* Background Gradients & Grid */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[1200px] rounded-[100%] bg-[var(--hero-glow)] blur-[150px] opacity-60 dark:opacity-20" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, var(--hero-glow-strong), transparent 60%)' }} />
        <div className="absolute inset-0" style={{ opacity: 'var(--hero-dot-opacity)', backgroundImage: 'radial-gradient(circle at center, var(--landing-text-primary) 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'linear-gradient(to bottom, white 20%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, white 20%, transparent 80%)' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-4 pb-6 lg:pt-6">
        {/* HERO SECTION */}
        <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8 max-h-[600px]">
          <div className="flex flex-col items-start text-left animate-fade-in-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] uppercase tracking-widest backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              AI-Powered Job Safety Platform
            </div>
            
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[3rem] leading-[1.1]">
              Protect Yourself from <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">Job Scams</span>
            </h1>
            
            <p className="mb-5 max-w-lg text-sm text-[var(--landing-text-secondary)] leading-relaxed font-medium">
              Scan job postings, analyze resumes, verify companies, and join a community fighting employment fraud — all powered by machine learning and explainable AI.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/scanner"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#2070ff] to-[#0055ff] px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 shadow-[0_0_20px_rgba(0,85,255,0.3)] hover:shadow-[0_0_30px_rgba(0,85,255,0.5)] hover:-translate-y-0.5 border border-[#4085ff]"
              >
                Scan a Job Posting
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!isAuthenticated ? (
                <Link
                  href="/register"
                  className="rounded-xl border border-[var(--landing-card-border)] bg-[var(--landing-card)] px-5 py-3 text-sm font-semibold text-[var(--landing-text-primary)] transition-all hover:bg-[var(--landing-card-hover)] hover:border-[var(--accent)]/20 hover:-translate-y-0.5 backdrop-blur-md"
                >
                  Create Free Account
                </Link>
              ) : (
                <Link
                  href="/analytics"
                  className="rounded-xl border border-[var(--landing-card-border)] bg-[var(--landing-card)] px-5 py-3 text-sm font-semibold text-[var(--landing-text-primary)] transition-all hover:bg-[var(--landing-card-hover)] hover:border-[var(--accent)]/20 hover:-translate-y-0.5 backdrop-blur-md"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Hero Visual — 3D Shield */}
          <div className="relative mx-auto flex w-full max-w-md items-center justify-center lg:max-w-none animate-fade-in delay-200 lg:pl-10">
            {/* Outer glow layer */}
            <div className="absolute inset-0 blur-3xl bg-[var(--hero-glow-strong)] rounded-full" />

            {/* 3D Shield Image */}
            <div 
              className="relative flex items-center justify-center"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <Image
                src="/hero-shield.png"
                alt="JobShield 3D Security Shield"
                width={380}
                height={380}
                className="relative z-10 drop-shadow-[0_0_60px_rgba(59,130,246,0.5)]"
                style={{
                  maskImage: 'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 72%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 40%, transparent 72%)',
                }}
                priority
              />
            </div>

            {/* Floating Tags */}
            <div 
              className="absolute -left-4 top-6 sm:-left-8 sm:top-12 flex items-center gap-2.5 rounded-xl border border-[var(--landing-float-border)] bg-[var(--landing-float-bg)] px-3 py-2 backdrop-blur-md"
              style={{ animation: 'float-slow 6s ease-in-out infinite', boxShadow: '0 8px 30px var(--landing-float-shadow)' }}
            >
              <div className="bg-[#0055ff]/20 p-1.5 rounded-md text-[#4085ff]">
                <Brain className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--landing-float-text)] tracking-wide">AI Detection</span>
            </div>
            
            <div 
              className="absolute -right-2 top-1/2 sm:-right-6 flex items-center gap-2.5 rounded-xl border border-[var(--landing-float-border)] bg-[var(--landing-float-bg)] px-3 py-2 backdrop-blur-md"
              style={{ animation: 'float-slower 7s ease-in-out infinite reverse', boxShadow: '0 8px 30px var(--landing-float-shadow)' }}
            >
              <div className="bg-emerald-500/20 p-1.5 rounded-md text-emerald-500 dark:text-emerald-400">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--landing-float-text)] tracking-wide">Resume Analysis</span>
            </div>
            
            <div 
              className="absolute right-8 -top-2 sm:right-12 sm:-top-4 flex items-center gap-2.5 rounded-xl border border-[var(--landing-float-border)] bg-[var(--landing-float-bg)] px-3 py-2 backdrop-blur-md"
              style={{ animation: 'float-slowest 8s ease-in-out infinite', boxShadow: '0 8px 30px var(--landing-float-shadow)' }}
            >
              <div className="bg-amber-500/20 p-1.5 rounded-md text-amber-500 dark:text-amber-400">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--landing-float-text)] tracking-wide">Company Verification</span>
            </div>

            <div 
              className="absolute -bottom-2 left-12 sm:-bottom-4 sm:left-20 flex items-center gap-2.5 rounded-xl border border-[var(--landing-float-border)] bg-[var(--landing-float-bg)] px-3 py-2 backdrop-blur-md"
              style={{ animation: 'float-slow 9s ease-in-out infinite reverse', boxShadow: '0 8px 30px var(--landing-float-shadow)' }}
            >
              <div className="bg-rose-500/20 p-1.5 rounded-md text-rose-500 dark:text-rose-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--landing-float-text)] tracking-wide">Community Reports</span>
            </div>
          </div>
        </section>

        {/* Gradient transition */}
        <div className="mt-8 sm:mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--landing-divider)] to-transparent" />

        {/* STATS SECTION */}
        <section className="mt-6 sm:mt-8">
          <div className="rounded-2xl border border-[var(--landing-card-border)] bg-[var(--landing-card)] backdrop-blur-md shadow-2xl dark:shadow-2xl relative overflow-hidden" style={{ boxShadow: 'var(--landing-stats-shadow)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--landing-card-border)]">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={[
                      "relative px-5 py-4 flex items-center justify-center gap-3 transition-colors duration-200 hover:bg-[var(--landing-card-hover)]",
                      i < 2 ? "border-b sm:border-b-0 border-[var(--landing-card-border)]" : "",
                    ].join(" ")}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-[var(--landing-text-primary)] tracking-tight leading-tight">{stat.value}</div>
                      <div className="text-[10px] font-semibold text-[var(--landing-text-muted)] uppercase tracking-wider">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Gradient transition */}
        <div className="mt-6 sm:mt-8 h-px w-full bg-gradient-to-r from-transparent via-[var(--landing-divider)] to-transparent" />

        {/* HOW IT WORKS */}
        <section className="mt-5 sm:mt-6 pt-0 relative">
          <div className="text-center mb-6">
            <h2 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest mb-2">How It Works</h2>
            <p className="text-2xl font-bold text-[var(--landing-text-primary)] tracking-tight">Three steps to safety</p>
          </div>
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-6 relative">
            <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--landing-divider)] to-transparent -translate-y-1/2 z-0" />
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--landing-step-border)] bg-[var(--landing-step-bg)] shadow-xl dark:shadow-xl">
                <LinkIcon className="h-6 w-6 text-[var(--landing-text-muted)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--landing-step-text)]">1. Input Job URL</span>
            </div>
            
            <ArrowRight className="hidden sm:block h-5 w-5 text-[var(--landing-text-muted)] z-10" />
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 shadow-[0_0_20px_rgba(0,85,255,0.15)]">
                <Brain className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--landing-step-text)]">2. AI Analyzes Text</span>
            </div>
            
            <ArrowRight className="hidden sm:block h-5 w-5 text-[var(--landing-text-muted)] z-10" />
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--landing-step-border)] bg-[var(--landing-step-bg)] shadow-xl dark:shadow-xl">
                <ShieldCheck className="h-6 w-6 text-[var(--success)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--landing-step-text)]">3. Get Risk Score</span>
            </div>
          </div>
        </section>

        {/* Gradient transition */}
        <div className="mt-12 sm:mt-14 h-px w-full bg-gradient-to-r from-transparent via-[var(--landing-divider)] to-transparent" />

        {/* FEATURES GRID */}
        <section className="mt-8 sm:mt-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[1000px] bg-[var(--hero-glow)] blur-[120px] rounded-full pointer-events-none opacity-40 dark:opacity-10" />
          
          <div className="mb-8 text-center">
            <h2 className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest mb-3">Our Core Features</h2>
            <h3 className="text-3xl font-bold tracking-tight text-[var(--landing-text-primary)] sm:text-4xl">
              Everything You Need to Stay Safe
            </h3>
            <p className="mt-3 text-[var(--landing-text-secondary)] text-base max-w-2xl mx-auto">
              A comprehensive toolkit for detecting scams, analyzing opportunities, and protecting job seekers.
            </p>
          </div>

          {/* Row 1 — Primary + Secondary (3 cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {features.slice(0, 3).map((feature) => {
              const Icon = feature.icon;
              const isPrimary = 'primary' in feature && feature.primary;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className={[
                    "group relative flex flex-col rounded-2xl border backdrop-blur-xl transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-2xl",
                    feature.borderColor,
                    feature.hoverBorder,
                    isPrimary
                      ? "p-5 bg-blue-500/5 shadow-[0_0_40px_rgba(59,130,246,0.08)] dark:shadow-[0_0_40px_rgba(59,130,246,0.12)] lg:scale-[1.02]"
                      : "p-5 bg-[var(--landing-card)]",
                  ].join(" ")}
                >
                  {/* Top accent line */}
                  {isPrimary && (
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent rounded-full" />
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${feature.tagBg} ${feature.tagBorder} ${feature.tagText}`}>
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-[var(--landing-text-primary)] tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--landing-text-muted)] leading-relaxed font-medium flex-1">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-3 flex items-center justify-end">
                    <ArrowRight className={`h-4 w-4 ${feature.iconColor} opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0`} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Row 2 — Supporting Features (2 centered cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 mt-5 lg:mx-auto lg:max-w-3xl">
            {features.slice(3).map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className={[
                    "group relative flex flex-col rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-2xl hover:border-[var(--accent)]/20",
                    feature.borderColor,
                    feature.hoverBorder,
                    "bg-[var(--landing-card)]",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} strokeWidth={1.5} />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${feature.tagBg} ${feature.tagBorder} ${feature.tagText}`}>
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-[var(--landing-text-primary)] tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--landing-text-muted)] leading-relaxed font-medium flex-1">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-3 flex items-center justify-end">
                    <ArrowRight className={`h-4 w-4 ${feature.iconColor} opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
