import { clsx } from "clsx";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  borderColor?: "primary" | "secondary" | "tertiary" | "error" | "none";
}

export function Card({
  children,
  className,
  borderColor = "none",
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl shadow-soft border border-outline-variant/10",
        borderColor !== "none" && `border-l-4 border-l-${borderColor}`,
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: string;
  borderColor?: "primary" | "secondary" | "tertiary" | "error";
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon,
  borderColor,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10",
        borderColor && `border-l-4 border-l-${borderColor}`
      )}
    >
      <p className="font-label-md text-on-surface-variant/70 font-medium">
        {label}
      </p>
      <div className="flex items-end justify-between mt-1">
        <h3 className="font-display-lg text-on-surface">{value}</h3>
        {change && (
          <span
            className={clsx(
              "font-data-mono font-label-md",
              changeType === "positive" && "text-primary",
              changeType === "negative" && "text-error",
              changeType === "neutral" && "text-on-surface-variant"
            )}
          >
            {change}
          </span>
        )}
        {icon && (
          <span
            className={clsx(
              "material-symbols-outlined",
              borderColor && `text-${borderColor}`
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
