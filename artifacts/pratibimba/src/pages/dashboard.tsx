import { Link } from "wouter";
import { useApp } from "../context/app-context";

export default function DashboardPage() {
  const { auditPlans, scheduledAudits, reports, getDaysOpen, isRedFlagged } = useApp();

  const openReports = reports.filter((r) => r.status === "open");
  const closedReports = reports.filter((r) => r.status === "closed");
  const nonConformance = reports.filter((r) => r.severity === "non_conformance");
  const openForImprovement = reports.filter((r) => r.severity === "open_for_improvement");
  const redFlagged = reports.filter(isRedFlagged);
  const activeScheduled = scheduledAudits.filter((s) => {
    const end = new Date(s.endDate);
    return end >= new Date();
  });

  const overallCompliance = reports.length > 0
    ? Math.round((closedReports.length / reports.length) * 100)
    : 0;

  const avgDaysOpen = openReports.length > 0
    ? Math.round(openReports.reduce((acc, r) => acc + getDaysOpen(r), 0) / openReports.length)
    : 0;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Dashboard</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">Overview of audit plans, schedules, and compliance status.</p>
        </div>
        <div className="font-data-mono text-[11px] text-on-surface-variant/60 bg-surface-container-low px-3 py-2 rounded-lg">
          {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Audit Plans", value: auditPlans.length, icon: "event_note", color: "text-secondary", border: "border-l-secondary" },
          { label: "Scheduled", value: scheduledAudits.length, icon: "calendar_month", color: "text-primary", border: "border-l-primary" },
          { label: "Active Audits", value: activeScheduled.length, icon: "pending_actions", color: "text-on-secondary-container", border: "border-l-on-secondary-container" },
          { label: "Open Reports", value: openReports.length, icon: "fact_check", color: "text-on-surface", border: "border-l-outline-variant" },
          { label: "Non-Conformance", value: nonConformance.length, icon: "error_outline", color: "text-error", border: "border-l-error" },
          { label: "🚨 Red Flagged", value: redFlagged.length, icon: "flag", color: "text-error font-black", border: "border-l-error bg-error/5" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-white p-4 rounded-xl shadow-soft border-l-4 ${stat.border}`}>
            <div className="flex justify-between items-start">
              <p className="font-label-md text-on-surface-variant/80 leading-tight">{stat.label}</p>
              <span className={`material-symbols-outlined text-[18px] opacity-40 ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className={`font-display-lg mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Ring */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col items-center justify-center gap-4">
          <h3 className="font-headline-sm w-full">Closure Rate</h3>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-surface-container-high" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="currentColor" strokeWidth="4"
                strokeDasharray={`${overallCompliance * 87.96 / 100} 87.96`}
                strokeLinecap="round"
                className={overallCompliance >= 70 ? "text-secondary" : overallCompliance >= 40 ? "text-primary" : "text-error"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[28px] text-on-surface">{overallCompliance}%</span>
              <span className="font-label-md text-on-surface-variant/60 text-[10px]">CLOSED</span>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-3 text-center">
            <div className="bg-surface-container-lowest rounded-lg p-2">
              <p className="font-display-lg text-[22px] text-secondary">{closedReports.length}</p>
              <p className="font-label-md text-on-surface-variant/70">Closed</p>
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-2">
              <p className="font-display-lg text-[22px] text-primary">{openReports.length}</p>
              <p className="font-label-md text-on-surface-variant/70">Open</p>
            </div>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <h3 className="font-headline-sm mb-5">Severity Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-error font-bold">Non-Conformance</span>
                <span>{nonConformance.length} ({reports.length ? Math.round(nonConformance.length / reports.length * 100) : 0}%)</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: `${reports.length ? nonConformance.length / reports.length * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-primary font-bold">Open for Improvement</span>
                <span>{openForImprovement.length} ({reports.length ? Math.round(openForImprovement.length / reports.length * 100) : 0}%)</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${reports.length ? openForImprovement.length / reports.length * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-error/5 rounded-lg border border-error/20 flex items-center gap-3">
            <span className="material-symbols-outlined text-error">flag</span>
            <div>
              <p className="font-label-md font-bold text-error">{redFlagged.length} Red-Flagged Reports</p>
              <p className="text-[11px] text-on-surface-variant/70">Non-Conformance open &gt;30 days</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-surface-container-low rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant/60">timer</span>
            <div>
              <p className="font-label-md font-bold text-on-surface">Avg. {avgDaysOpen} days open</p>
              <p className="text-[11px] text-on-surface-variant/70">Across all open reports</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-headline-sm">Recent Reports</h3>
            <Link href="/all-reports" className="font-label-md text-primary hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {reports.slice(0, 4).map((report) => (
              <div key={report.id} className={`flex items-start gap-3 p-3 rounded-lg border ${isRedFlagged(report) ? "border-error/40 bg-error/5" : "border-outline-variant/20"}`}>
                <span className={`material-symbols-outlined text-[16px] mt-0.5 ${report.severity === "non_conformance" ? "text-error" : "text-primary"}`}>
                  {report.severity === "non_conformance" ? "error_outline" : "info"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-data-mono text-[11px] font-bold text-on-surface truncate">{report.iqrNumber}</p>
                  <p className="font-label-md text-on-surface-variant/70 truncate">{report.prakalpa}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Plans & Scheduled */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="font-headline-sm">Pending Audit Plans</h3>
            <Link href="/audit-plan" className="font-label-md text-primary hover:underline">View All ({auditPlans.length})</Link>
          </div>
          {auditPlans.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant/50 font-body-md">No audit plans pending</div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {auditPlans.slice(0, 3).map((plan) => (
                <div key={plan.id} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-[16px]">event_note</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-data-mono text-[11px] text-primary font-bold">{plan.iqaNumber}</p>
                    <p className="font-body-md font-medium text-on-surface truncate">{plan.prakalpa}</p>
                    <p className="font-label-md text-on-surface-variant/70 truncate">{plan.purpose}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-data-mono text-[11px] text-on-surface-variant/60">Due</p>
                    <p className="font-label-md font-bold text-on-surface">{new Date(plan.expectedEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="font-headline-sm">Scheduled Audits</h3>
            <Link href="/scheduled-audits" className="font-label-md text-primary hover:underline">View All ({scheduledAudits.length})</Link>
          </div>
          {scheduledAudits.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant/50 font-body-md">No scheduled audits</div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {scheduledAudits.slice(0, 3).map((audit) => {
                const now = new Date();
                const start = new Date(audit.startDate);
                const end = new Date(audit.endDate);
                const isOngoing = start <= now && end >= now;
                const isUpcoming = start > now;
                return (
                  <div key={audit.id} className="p-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOngoing ? "bg-primary/10" : "bg-surface-container"}`}>
                      <span className={`material-symbols-outlined text-[16px] ${isOngoing ? "text-primary" : "text-on-surface-variant"}`}>calendar_month</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-data-mono text-[11px] text-primary font-bold">{audit.iqaNumber}</p>
                      <p className="font-body-md font-medium text-on-surface truncate">{audit.prakalpa}</p>
                      <p className="font-label-md text-on-surface-variant/70">{audit.finalAuditor}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isOngoing ? "bg-primary/10 text-primary" : isUpcoming ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface-variant"}`}>
                      {isOngoing ? "Ongoing" : isUpcoming ? "Upcoming" : "Completed"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
