interface SkeletonProps {
  className?: string;
  variant?: "line" | "circle" | "card";
}

export function Skeleton({ className = "", variant = "line" }: SkeletonProps) {
  const base = "animate-shimmer rounded-lg";
  const variants = {
    line: `${base} h-4 w-full`,
    circle: `${base} h-10 w-10 rounded-full`,
    card: `${base} h-32 w-full rounded-2xl`,
  };

  return <div className={`${variants[variant]} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center gap-4">
          <Skeleton variant="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 space-y-3">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
