import Link from "next/link";
import { ShieldCheck, Github, Book, Code2 } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--card-border)] bg-[var(--background)] overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[var(--card-border)] to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[800px] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 font-semibold text-lg hover:opacity-80 transition-opacity w-fit">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] shadow-sm">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-[var(--foreground)] tracking-tight font-bold">JobShield</span>
            </Link>
            <p className="mt-6 text-sm leading-relaxed text-[var(--muted)] max-w-sm font-medium">
              AI-powered job safety platform. Verify companies, analyze resumes, and protect yourself from employment fraud with machine learning.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-6">Product</h3>
            <ul className="space-y-4">
              {[
                { label: "Job Scanner", href: "/scanner" },
                { label: "Resume Analysis", href: "/resume" },
                { label: "Company Reputation", href: "/company" },
                { label: "Community Reports", href: "/reports" },
                { label: "Analytics", href: "/analytics" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-6">Resources</h3>
            <ul className="space-y-4">
              <li>
                <a href="https://github.com/sourav-bhowal/AI_Based_Job_System" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-6">About</h3>
            <ul className="space-y-4">
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  Project Details
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  Methodology
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)] font-medium">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[var(--card-border)]">
          <p className="text-xs text-[var(--muted)] font-medium">
            &copy; {currentYear} JobShield. Academic Purpose.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted)]">
            <span>Open Source</span>
            <span className="h-1 w-1 rounded-full bg-[var(--card-border)]"></span>
            <span>Final Year Project</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
