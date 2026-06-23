import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getDashboardStats, type DashboardStats } from "../lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const dashboardStats = await getDashboardStats();
        setStats(dashboardStats);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const safePercent = (value: number) => {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 0), 100);
  };

  const closureRate = safePercent(stats?.closureRate || 0);
  const iqaCoverage = safePercent(stats?.iqaCoverage || 0);
  const ncClosedPercentage = safePercent(stats?.ncClosedPercentage || 0);
  const overdueNCsPercentage = safePercent(stats?.overdueNCsPercentage || 0);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">Dashboard failed to load</p>
          <p className="font-body-md mt-1">
            {errorMessage || "No dashboard data available"}
          </p>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Prakalpas",
      value: stats.numberOfPrakalpas,
      icon: "account_tree",
      color: "text-secondary",
      border: "border-l-secondary"
    },
    {
      label: "Audit Plans",
      value: stats.numberOfAuditsPlanned,
      icon: "event_note",
      color: "text-secondary",
      border: "border-l-secondary"
    },
    {
      label: "Scheduled",
      value: stats.auditsScheduled,
      icon: "calendar_month",
      color: "text-primary",
      border: "border-l-primary"
    },
    {
      label: "Completed",
      value: stats.auditsCompleted,
      icon: "task_alt",
      color: "text-secondary",
      border: "border-l-secondary"
    },
    {
      label: "NC Reports",
      value: stats.totalNCsReported,
      icon: "error_outline",
      color: "text-error",
      border: "border-l-error"
    },
    {
      label: "OFI Reports",
      value: stats.totalOFIReported,
      icon: "info",
      color: "text-primary",
      border: "border-l-primary"
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Dashboard</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            Live overview from backend MongoDB audit data.
          </p>
        </div>

        <div className="font-data-mono text-[11px] text-on-surface-variant/60 bg-surface-container-low px-3 py-2 rounded-lg">
          Assessment Year: {stats.assessmentYear}
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-4 rounded-xl shadow-soft border-l-4 ${stat.border}`}
          >
            <div className="flex justify-between items-start">
              <p className="font-label-md text-on-surface-variant/80 leading-tight">
                {stat.label}
              </p>
              <span
                className={`material-symbols-outlined text-[18px] opacity-40 ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>
            <p className={`font-display-lg mt-1 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col items-center justify-center gap-4">
          <h3 className="font-headline-sm w-full">Closure Rate</h3>

          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="4"
                className="text-surface-container-high"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={`${closureRate * 87.96 / 100} 87.96`}
                strokeLinecap="round"
                className={
                  closureRate >= 70
                    ? "text-secondary"
                    : closureRate >= 40
                      ? "text-primary"
                      : "text-error"
                }
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[28px] text-on-surface">
                {closureRate}%
              </span>
              <span className="font-label-md text-on-surface-variant/60 text-[10px]">
                CLOSED
              </span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-surface-container-lowest rounded-lg p-2">
              <p className="font-display-lg text-[22px] text-secondary">
                {stats.ncsClosed}
              </p>
              <p className="font-label-md text-on-surface-variant/70">
                NCs Closed
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-2">
              <p className="font-display-lg text-[22px] text-primary">
                {stats.ncsInOpenStatus}
              </p>
              <p className="font-label-md text-on-surface-variant/70">
                NCs Open
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <h3 className="font-headline-sm mb-5">IQA Coverage</h3>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-secondary font-bold">Prakalpas in Audit Scope</span>
                <span>{iqaCoverage}%</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: `${iqaCoverage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-primary font-bold">NC Closure</span>
                <span>{ncClosedPercentage}%</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${ncClosedPercentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-error font-bold">Overdue NCs</span>
                <span>{overdueNCsPercentage}%</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="bg-error h-full rounded-full"
                  style={{ width: `${overdueNCsPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-error/5 rounded-lg border border-error/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-error">flag</span>
            <div>
              <p className="font-label-md font-bold text-error">
                {stats.overdueNCs} Overdue NCs
              </p>
              <p className="text-[11px] text-on-surface-variant/70">
                Open NC reports past due date
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <h3 className="font-headline-sm mb-5">Audit Summary</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="font-label-md text-on-surface-variant">
                Prakalpas with Audit Scope
              </span>
              <span className="font-data-mono font-bold text-on-surface">
                {stats.numberOfPrakalpasWithAuditScope}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="font-label-md text-on-surface-variant">
                Avg Audits per Prakalpa
              </span>
              <span className="font-data-mono font-bold text-on-surface">
                {stats.avgAuditsPerPrakalpa}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="font-label-md text-on-surface-variant">
                Total Reports
              </span>
              <span className="font-data-mono font-bold text-on-surface">
                {stats.totalReports}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg">
              <span className="font-label-md text-on-surface-variant">
                Open NCs
              </span>
              <span className="font-data-mono font-bold text-error">
                {stats.ncsInOpenStatus}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="font-headline-sm">Audit Workflow</h3>
            <Link href="/audit-plan" className="font-label-md text-primary hover:underline">
              View Audit Plans
            </Link>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                Planned
              </p>
              <p className="font-display-lg text-secondary">
                {stats.numberOfAuditsPlanned}
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                Scheduled
              </p>
              <p className="font-display-lg text-primary">
                {stats.auditsScheduled}
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                Completed
              </p>
              <p className="font-display-lg text-secondary">
                {stats.auditsCompleted}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="font-headline-sm">Reports</h3>
            <Link href="/all-reports" className="font-label-md text-primary hover:underline">
              View Reports
            </Link>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                Total
              </p>
              <p className="font-display-lg text-on-surface">
                {stats.totalReports}
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                NC
              </p>
              <p className="font-display-lg text-error">
                {stats.totalNCsReported}
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-label-md text-on-surface-variant">
                OFI
              </p>
              <p className="font-display-lg text-primary">
                {stats.totalOFIReported}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}