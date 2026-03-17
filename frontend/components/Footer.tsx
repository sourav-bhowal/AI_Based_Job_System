import Link from "next/link";
import { ShieldCheck, Github, Book, Code2 } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--card-border)] bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="md:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg hover:opacity-80 transition-opacity w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[var(--foreground)] tracking-tight">JobShield</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] max-w-sm">
              AI-powered job safety platform. Verify companies, analyze resumes, and protect yourself from employment fraud with machine learning.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-3">
              {[
                { label: "Job Scanner", href: "/scanner" },
                { label: "Resume Analysis", href: "/resume" },
                { label: "Company Reputation", href: "/company" },
                { label: "Community Reports", href: "/reports" },
                { label: "Analytics Dashboard", href: "/analytics" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Project Links */}
          <div className="md:col-span-1 lg:col-span-2 lg:ml-auto">
            <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://github.com/sourav-bhowal/AI_Based_Job_System" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] font-medium">
                  <Github className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="#" className="group flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] font-medium">
                  <Book className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="group flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)] font-medium">
                  <Code2 className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  API Reference
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-[var(--card-border)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted)]/80 font-medium">
            &copy; 2026 JobShield — Final Year Project
          </p>
          <div className="flex gap-4 text-xs font-semibold text-[var(--muted)]/60">
            <span>Open Source</span>
            <span>&middot;</span>
            <span>Academic Purpose</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
