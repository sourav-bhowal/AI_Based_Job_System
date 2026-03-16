import CompanyForm from "@/components/company/CompanyForm";

export const metadata = {
  title: "Company Checker - JobShield AI",
  description: "Verify company trustworthiness through domain age, email records, social presence, and community data.",
};

export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header (Server Rendered) */}
      <div className="mb-8 animate-fade-in">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Trust Verification
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">Company Reputation</h1>
        <p className="text-[var(--muted)] max-w-xl">Verify company trustworthiness through domain age, email records, social presence, and community data.</p>
      </div>

      {/* Interactive Form Island */}
      <CompanyForm />
    </div>
  );
}
