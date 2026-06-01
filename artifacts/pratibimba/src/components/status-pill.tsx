import { clsx } from "clsx";

type StatusType = "pending" | "verified" | "failed" | "escalated" | "in-review";

interface StatusPillProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: "bg-[#fff2e0] text-[#a33900]",
  verified: "bg-[#e7f5ed] text-[#2e7d32]",
  failed: "bg-[#fdecea] text-[#ba1a1a]",
  escalated: "bg-red-50 text-red-600",
  "in-review": "bg-blue-50 text-blue-600",
};

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
  escalated: "Escalated",
  "in-review": "In Review",
};

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide",
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

type PriorityType = "low" | "medium" | "high";

interface PriorityBadgeProps {
  priority: PriorityType;
  className?: string;
}

const priorityStyles: Record<PriorityType, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-50 text-yellow-700",
  high: "bg-red-50 text-red-600",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
        priorityStyles[priority],
        className
      )}
    >
      {priority}
    </span>
  );
}
