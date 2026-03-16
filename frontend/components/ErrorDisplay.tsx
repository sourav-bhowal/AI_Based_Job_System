import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div className="mx-auto max-w-md animate-fade-in rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-subtle)] p-6 text-center shadow-[var(--shadow-sm)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-[var(--danger)]">
        {title}
      </h3>
      <p className="mb-4 text-sm text-[var(--danger)]/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-[var(--danger)] px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--danger)]/90 hover:shadow-[var(--shadow-md)]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
