"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Search, FileText, Building2, ShieldAlert, BarChart3, Menu, X, LogOut, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { href: "/scanner", label: "Job Scanner", icon: Search },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/company", label: "Company", icon: Building2 },
  { href: "/reports", label: "Community", icon: ShieldAlert },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function NavbarClient() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]/50"
              }`}
            >
              <Icon className="hidden lg:inline mr-2 h-4 w-4" />
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Auth & Actions Section */}
      <div className="hidden md:flex items-center gap-3 ml-4 border-l border-[var(--card-border)] pl-4">
        <ThemeToggle />
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-2 border-l border-[var(--card-border)] pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
                <UserCircle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                {user?.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition-all duration-200 hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition-all duration-200 hover:text-[var(--foreground)]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[var(--accent-light)] hover:shadow-md"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>

      {/* Mobile Actions & Hamburger */}
      <div className="md:hidden flex items-center gap-2">
        <ThemeToggle />
        <button
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--accent-subtle)]/50 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-[var(--card-border)] bg-[var(--card)] px-4 pb-4 pt-2 md:hidden animate-fade-in shadow-[var(--shadow-lg)]">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-subtle)]/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <div className="mt-3 border-t border-[var(--card-border)] pt-3">
            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
              >
                <LogOut className="h-4 w-4" />
                Logout ({user?.username})
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--accent-subtle)]/50 text-center border border-[var(--card-border)]">Login</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-lg bg-[var(--accent)] px-3 py-2.5 text-center text-sm font-medium text-white shadow-sm">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
