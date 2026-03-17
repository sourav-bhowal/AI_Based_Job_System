interface RiskBadgeProps {
  level: string;
  score?: number;
  size?: "sm" | "md" | "lg";
}

const styleMap: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  Safe: {
    bg: "bg-[var(--success-subtle)]",
    text: "text-[var(--success)]",
    ring: "ring-[var(--success)]/20",
    dot: "bg-[var(--success)]",
  },
  "Medium Risk": {
    bg: "bg-[var(--warning-subtle)]",
    text: "text-[var(--warning)]",
    ring: "ring-[var(--warning)]/20",
    dot: "bg-[var(--warning)]",
  },
  "High Risk": {
    bg: "bg-[var(--danger-subtle)]",
    text: "text-[var(--danger)]",
    ring: "ring-[var(--danger)]/20",
    dot: "bg-[var(--danger)]",
  },
};

const sizeMap = {
  sm: "px-2 py-0.5 text-xs gap-1.5",
  md: "px-3 py-1 text-sm gap-2",
  lg: "px-4 py-1.5 text-base gap-2",
};

export default function RiskBadge({ level, score, size = "md" }: RiskBadgeProps) {
  const s = styleMap[level] || styleMap["Medium Risk"];
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ring-1 ${s.bg} ${s.text} ${s.ring} ${sizeMap[size]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {level}
      {score !== undefined && (
        <span className="font-normal opacity-70">({score.toFixed(1)})</span>
      )}
    </span>
  );
}
