import ScannerForm from "@/components/scanner/ScannerForm";

export const metadata = {
  title: "Scanner - JobShield AI",
  description: "Analyze job postings with multi-model ML, NER, and salary anomaly detection.",
};

export default function ScannerPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header (Server Rendered) */}
      <div className="mb-8 animate-fade-in text-center lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-subtle)] px-3 py-1 text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/10">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          AI-Powered Analysis
        </div>
        <h1 className="mb-2 text-2xl lg:text-3xl font-bold text-[var(--foreground)] tracking-tight">Job Scam Scanner</h1>
        <p className="text-[var(--muted)] text-sm lg:text-base">Analyze job postings with multi-model ML, NER, and salary anomaly detection.</p>
      </div>

      {/* Interactive Form Island */}
      <ScannerForm />
    </div>
  );
}
