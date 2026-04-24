import CompanyForm from "@/components/company/CompanyForm";

export const metadata = {
  title: "Company Checker - JobShield AI",
  description: "Verify company trustworthiness through domain age, email records, social presence, and community data.",
};

export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header (Server Rendered) */}
      <div className="mb-8 animate-fade-in text-center lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Trust Verification
        </div>
        <h1 className="mb-2 text-2xl lg:text-3xl font-bold tracking-tight text-[var(--foreground)]">Company Reputation</h1>
        <p className="text-[var(--muted)] text-sm lg:text-base max-w-2xl mx-auto lg:mx-0">Verify company trustworthiness through domain age, email records, social presence, and community data.</p>
      </div>

      {/* Interactive Form Island */}
      <CompanyForm />
    </div>
  );
}
