export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-in">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-3 border-[var(--card-border)]" />
        <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-3 border-transparent border-t-[var(--accent)]" />
      </div>
      {message && (
        <p className="text-sm text-[var(--muted)]">{message}</p>
      )}
    </div>
  );
}
