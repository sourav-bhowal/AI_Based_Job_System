import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import NavbarClient from "./NavbarClient";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-lg transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline text-[var(--foreground)] tracking-tight">
            JobShield
          </span>
        </Link>

        {/* Client interactive parts */}
        <NavbarClient />
      </div>
    </nav>
  );
}
