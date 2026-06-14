import { Link } from "wouter";
import { useApp, PRAKALPAS } from "../context/app-context";

export default function DashboardPage() {
  const { auditPlans, scheduledAudits, reports, getDaysOpen, isRedFlagged, isOverdue } = useApp();

  const currentYear = new Date().getFullYear();
  const assessmentYear = `${currentYear - 1}-${String(currentYear).slice(2)}`;

  const openReports = reports.filter((r) => r.status === "open");
  const closedReports = reports.filter((r) => r.status === "closed");
  const ncReports = reports.filter((r) => r.severity === "non_conformance");
  const ofiReports = reports.filter((r) => r.severity === "open_for_improvement");
  const ncOpen = ncReports.filter((r) => r.status === "open");
  const ncClosed = ncReports.filter((r) => r.status === "closed");
  const redFlagged = reports.filter(isRedFlagged);
  const overdueNCs = ncOpen.filter(isOverdue);

  // Prakalpa coverage
  const prakalpasWithAudit = new Set([
    ...scheduledAudits.map((s) => s.prakalpa),
    ...auditPlans.map((p) => p.prakalpa),
  ]);
  const totalPrakalpas = PRAKALPAS.length;
  const prakalpasWithScope = prakalpasWithAudit.size;
  const iqaCoverage = totalPrakalpas > 0 ? Math.round((prakalpasWithScope / totalPrakalpas) * 100) : 0;

  // Audit stats
  const auditsPlanned = auditPlans.length + scheduledAudits.length;
  const avgAuditsPerPrakalpa = prakalpasWithScope > 0 ? (auditsPlanned / prakalpasWithScope).toFixed(1) : "0";
  const auditsCompleted = scheduledAudits.filter((s) => new Date(s.endDate) < new Date()).length;

  // NC stats
  const ncClosedPct = ncReports.length > 0 ? Math.round((ncClosed.length / ncReports.length) * 100) : 0;
  const overdueNCPct = ncOpen.length > 0 ? Math.round((overdueNCs.length / ncOpen.length) * 100) : 0;
  const closureRate = reports.length > 0 ? Math.round((closedReports.length / reports.length) * 100) : 0;

  const activeScheduled = scheduledAudits.filter((s) => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    const now = new Date();
    return start <= now && end >= now;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Dashboard</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">Assessment Year: <strong>{assessmentYear}</strong> · Overview of audit plans, schedules, and compliance status.</p>
        </div>
        <div className="font-data-mono text-[11px] text-on-surface-variant/60 bg-surface-container-low px-3 py-2 rounded-lg">
          {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Prakalpa Coverage Row */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">Prakalpa Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Prakalpas", value: totalPrakalpas, icon: "location_city", color: "text-on-surface", border: "border-l-outline-variant" },
            { label: "Prakalpas with Audit", value: prakalpasWithScope, icon: "domain_verification", color: "text-secondary", border: "border-l-secondary" },
            { label: "IQA Coverage", value: `${iqaCoverage}%`, icon: "donut_large", color: "text-primary", border: "border-l-primary" },
            { label: "Avg Audits / Prakalpa", value: avgAuditsPerPrakalpa, icon: "calculate", color: "text-on-secondary-container", border: "border-l-on-secondary-container" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white p-4 rounded-xl shadow-soft border-l-4 ${stat.border}`}>
              <div className="flex justify-between items-start">
                <p className="font-label-md text-on-surface-variant/80 leading-tight">{stat.label}</p>
                <span className={`material-symbols-outlined text-[18px] opacity-40 ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className={`font-display-lg mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Activity Row */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">Audit Activity</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Audits Planned", value: auditsPlanned, icon: "event_note", color: "text-secondary", border: "border-l-secondary" },
            { label: "Audits Completed", value: auditsCompleted, icon: "task_alt", color: "text-secondary", border: "border-l-secondary" },
            { label: "Active Audits", value: activeScheduled.length, icon: "pending_actions", color: "text-primary", border: "border-l-primary" },
            { label: "Pending Plans", value: auditPlans.length, icon: "schedule", color: "text-on-surface-variant", border: "border-l-outline-variant" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white p-4 rounded-xl shadow-soft border-l-4 ${stat.border}`}>
              <div className="flex justify-between items-start">
                <p className="font-label-md text-on-surface-variant/80 leading-tight">{stat.label}</p>
                <span className={`material-symbols-outlined text-[18px] opacity-40 ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className={`font-display-lg mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NC / OFI Stats */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">NC & OFI Findings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Total NCs", value: ncReports.length, icon: "error_outline", color: "text-error", border: "border-l-error" },
            { label: "Total OFIs", value: ofiReports.length, icon: "info", color: "text-primary", border: "border-l-primary" },
            { label: "NCs Open", value: ncOpen.length, icon: "radio_button_unchecked", color: "text-error", border: "border-l-error" },
            { label: "NCs Closed", value: ncClosed.length, icon: "check_circle", color: "text-secondary", border: "border-l-secondary" },
            { label: "% NCs Closed", value: `${ncClosedPct}%`, icon: "percent", color: "text-secondary", border: "border-l-secondary" },
            { label: "Overdue NCs", value: overdueNCs.length, icon: "alarm_off", color: "text-error font-black", border: "border-l-error bg-error/5" },
            { label: "Overdue NCs %", value: `${overdueNCPct}%`, icon: "warning", color: "text-error", border: "border-l-error" },
            { label: "Closure Rate", value: `${closureRate}%`, icon: "donut_large", color: closureRate >= 70 ? "text-secondary" : closureRate >= 40 ? "text-primary" : "text-error", border: closureRate >= 70 ? "border-l-secondary" : closureRate >= 40 ? "border-l-primary" : "border-l-error" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-white p-4 rounded-xl shadow-soft border-l-4 ${stat.border}`}>
              <div className="flex justify-between items-start">
                <p className="font-label-md text-on-surface-variant/80 leading-tight text-[11px]">{stat.label}</p>
                <span className={`material-symbols-outlined text-[16px] opacity-40 ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className={`font-display-lg mt-1 text-[22px] ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Closure Rate Ring */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col items-center justify-center gap-4">
          <h3 className="font-headline-sm w-full">Closure Rate</h3>
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-surface-container-high" />
              <circle cx="18" cy="18" r="14" fill="transparent" stroke="currentColor" strokeWidth="4"
                strokeDasharray={`${closureRate * 87.96 / 100} 87.96`}
                strokeLinecap="round"
                className={closureRate >= 70 ? "text-secondary" : closureRate >= 40 ? "text-primary" : "text-error"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[28px] text-on-surface">{closureRate}%</span>
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
                <span className="text-error font-bold">Non-Conformance (NC)</span>
                <span>{ncReports.length} ({reports.length ? Math.round(ncReports.length / reports.length * 100) : 0}%)</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: `${reports.length ? ncReports.length / reports.length * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-label-md mb-1">
                <span className="text-primary font-bold">Open for Improvement (OFI)</span>
                <span>{ofiReports.length} ({reports.length ? Math.round(ofiReports.length / reports.length * 100) : 0}%)</span>
              </div>
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${reports.length ? ofiReports.length / reports.length * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {redFlagged.length > 0 && (
              <div className="p-3 bg-error/5 rounded-lg border border-error/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-[18px]">flag</span>
                <p className="font-label-md font-bold text-error">{redFlagged.length} Red-Flagged (NC open &gt;30 days)</p>
              </div>
            )}
            {overdueNCs.length > 0 && (
              <div className="p-3 bg-error/5 rounded-lg border border-error/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-[18px]">alarm_off</span>
                <p className="font-label-md font-bold text-error">{overdueNCs.length} Overdue NCs ({overdueNCPct}%)</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Reports */}
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
                  <p className="font-data-mono text-[11px] font-bold text-on-surface truncate">{report.iarNumber}</p>
                  <p className="font-label-md text-on-surface-variant/70 truncate">{report.prakalpa}{report.location ? ` · ${report.location}` : ""}</p>
                  {report.auditArea && <p className="font-label-md text-on-surface-variant/50 text-[10px] truncate">{report.auditArea}</p>}
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
                    <p className="font-body-md font-medium text-on-surface truncate">{plan.prakalpa}{plan.location ? ` — ${plan.location}` : ""}</p>
                    <p className="font-label-md text-on-surface-variant/70 truncate">{plan.auditCoordinator}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-data-mono text-[11px] text-on-surface-variant/60">Planned</p>
                    <p className="font-label-md font-bold text-on-surface">{plan.auditPlannedDate ? new Date(plan.auditPlannedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</p>
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
                const auditReports = reports.filter((r) => r.iqaNumber === audit.iqaNumber);
                const ncCount = auditReports.filter((r) => r.severity === "non_conformance").length;
                const ofiCount = auditReports.filter((r) => r.severity === "open_for_improvement").length;
                return (
                  <div key={audit.id} className="p-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOngoing ? "bg-primary/10" : "bg-surface-container"}`}>
                      <span className={`material-symbols-outlined text-[16px] ${isOngoing ? "text-primary" : "text-on-surface-variant"}`}>calendar_month</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-data-mono text-[11px] text-primary font-bold">{audit.iqaNumber}</p>
                      <p className="font-body-md font-medium text-on-surface truncate">{audit.prakalpa}{audit.location ? ` — ${audit.location}` : ""}</p>
                      <div className="flex gap-2 mt-0.5">
                        {ncCount > 0 && <span className="font-label-md text-[10px] text-error">NC:{ncCount}</span>}
                        {ofiCount > 0 && <span className="font-label-md text-[10px] text-primary">OFI:{ofiCount}</span>}
                      </div>
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

      {/* Open Reports quick link */}
      {openReports.length > 0 && (
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-5 border border-primary/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">inbox</span>
            </div>
            <div>
              <p className="font-headline-sm text-on-surface">{openReports.length} Open Reports</p>
              <p className="font-body-md text-on-surface-variant/70">
                {ncOpen.length} NC · {openReports.filter(r => r.severity === "open_for_improvement").length} OFI
                {overdueNCs.length > 0 ? ` · ${overdueNCs.length} overdue` : ""}
              </p>
            </div>
          </div>
          <Link href="/open-reports" className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all shadow-sm whitespace-nowrap">
            View Open Reports
          </Link>
        </section>
      )}
    </div>
  );
}
