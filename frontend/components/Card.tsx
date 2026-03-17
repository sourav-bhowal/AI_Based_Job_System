import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "glass";
  padding?: "sm" | "md" | "lg";
  animate?: boolean;
}

const variantStyles: Record<string, string> = {
  default:
    "border-[var(--card-border)] bg-[var(--card)]",
  accent:
    "border-[var(--accent)]/20 bg-[var(--accent-subtle)]",
  success:
    "border-[var(--success)]/20 bg-[var(--success-subtle)]",
  warning:
    "border-[var(--warning)]/20 bg-[var(--warning-subtle)]",
  danger:
    "border-[var(--danger)]/20 bg-[var(--danger-subtle)]",
  glass:
    "border-[var(--card-border)]/50 bg-[var(--card)]/60 backdrop-blur-xl",
};

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className = "",
  variant = "default",
  padding = "md",
  animate = false,
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl border shadow-[var(--shadow-sm)]
        transition-all duration-200
        hover:shadow-[var(--shadow-md)]
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${animate ? "animate-fade-in" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
