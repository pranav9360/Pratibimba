import Image from "next/image";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";

// Mock data
const stats = [
  { label: "Total Audits", value: "1,284", change: "+4.2%", changeType: "positive" as const },
  { label: "Pending", value: "42", progress: 35 },
  { label: "Verified", value: "942", icon: "check_circle" },
  { label: "Failed", value: "30", alert: "High" },
  { label: "Escalated", value: "7", avatars: ["MK", "JP"] },
];

const recentAudits = [
  { id: "#AUD-9921", institution: "Sarvodaya Education Trust", status: "pending" as const, date: "Oct 24, 09:12" },
  { id: "#AUD-9918", institution: "Rural Uplift Foundation", status: "verified" as const, date: "Oct 23, 14:45" },
  { id: "#AUD-9915", institution: "Bright Vision NGO", status: "failed" as const, date: "Oct 23, 11:30" },
  { id: "#AUD-9910", institution: "Healthcare for All", status: "verified" as const, date: "Oct 22, 16:50" },
];

const priorityTasks = [
  {
    title: "Review Escalated Case: Sarv-90",
    description: "Suspicious transaction logs detected in Q3 report.",
    due: "Due Today",
    urgent: true,
    lead: "Rajesh K.",
  },
  {
    title: "Complete Verification: AUD-9917",
    description: "Awaiting document signatures from regional manager.",
    due: "Tomorrow",
    urgent: false,
    lead: "Ananya I.",
  },
  {
    title: "Data Integrity Check: Region 4",
    description: "Automated flagging system requires manual override.",
    due: "Oct 28",
    urgent: false,
    lead: "Vikram S.",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Summary Stats Widgets */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {/* Total Audits */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <p className="font-label-md text-on-surface-variant/70 font-medium">
            Total Audits
          </p>
          <div className="flex items-end justify-between mt-1">
            <h3 className="font-display-lg text-on-surface">1,284</h3>
            <span className="text-primary font-data-mono font-label-md">
              +4.2%
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <p className="font-label-md text-on-surface-variant/70 font-medium">
            Pending
          </p>
          <div className="flex items-end justify-between mt-1">
            <h3 className="font-display-lg text-secondary">42</h3>
            <div className="w-8 h-1.5 bg-secondary-fixed rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-[35%]" />
            </div>
          </div>
        </div>

        {/* Verified */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <p className="font-label-md text-on-surface-variant/70 font-medium">
            Verified
          </p>
          <div className="flex items-end justify-between mt-1">
            <h3 className="font-display-lg text-on-primary-fixed-variant">
              942
            </h3>
            <span className="material-symbols-outlined text-on-primary-fixed-variant filled">
              check_circle
            </span>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <p className="font-label-md text-on-surface-variant/70 font-medium">
            Failed
          </p>
          <div className="flex items-end justify-between mt-1">
            <h3 className="font-display-lg text-error">30</h3>
            <span className="text-error font-label-md font-bold">High</span>
          </div>
        </div>

        {/* Escalated */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <p className="font-label-md text-on-surface-variant/70 font-medium">
            Escalated
          </p>
          <div className="flex items-end justify-between mt-1">
            <h3 className="font-display-lg text-tertiary">7</h3>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-on-tertiary-fixed text-[10px] flex items-center justify-center text-white">
                MK
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-secondary text-[10px] flex items-center justify-center text-white">
                JP
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Section: Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Audit Trends */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline-sm">Monthly Audit Trends</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 font-label-md font-bold bg-surface-container text-primary rounded-full">
                Last 6 Months
              </button>
              <button className="px-3 py-1 font-label-md font-medium text-on-surface-variant/60 hover:bg-surface-container rounded-full transition-all">
                Yearly
              </button>
            </div>
          </div>
          <div className="h-[200px] w-full relative flex items-end">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 200"
              preserveAspectRatio="none"
            >
              <path
                d="M0,180 L100,140 L200,160 L300,90 L400,110 L500,40 L600,60 L700,20 L800,40 L800,200 L0,200 Z"
                fill="rgba(163, 57, 0, 0.08)"
              />
              <path
                d="M0,180 L100,140 L200,160 L300,90 L400,110 L500,40 L600,60 L700,20 L800,40"
                fill="none"
                stroke="#a33900"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="500" cy="40" r="4" fill="#a33900" />
            </svg>
          </div>
          <div className="flex justify-between px-4 mt-4 font-data-mono font-label-md text-on-surface-variant/40">
            <span>JAN</span>
            <span>FEB</span>
            <span>MAR</span>
            <span>APR</span>
            <span>MAY</span>
            <span>JUN</span>
            <span>JUL</span>
          </div>
        </div>

        {/* Completion Gauge */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col items-center justify-center text-center">
          <h2 className="font-headline-sm mb-6 w-full text-left">
            Completion Goal
          </h2>
          <div className="relative w-40 h-40 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                className="text-surface-container-high"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="439.8"
                strokeDashoffset="110"
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[32px] text-on-surface">
                75%
              </span>
              <span className="font-label-md text-on-surface-variant/60 font-medium">
                Compliance Rate
              </span>
            </div>
          </div>
          <p className="font-body-md text-on-surface-variant/70 italic px-6">
            &quot;Maintain 85% to reach Tier-1 Institution status.&quot;
          </p>
        </div>
      </section>

      {/* Bottom Section: Activities & Tasks */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden flex flex-col">
          <div className="p-6 flex justify-between items-center border-b border-outline-variant/5">
            <h2 className="font-headline-sm">Recent Audit Activities</h2>
            <Link
              href="/audits"
              className="text-primary font-label-md font-bold hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left font-label-md text-on-surface-variant/60 bg-surface-container-lowest">
                  <th className="py-4 px-6">AUDIT ID</th>
                  <th className="py-4 px-6">INSTITUTION</th>
                  <th className="py-4 px-6">STATUS</th>
                  <th className="py-4 px-6 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="font-body-md">
                {recentAudits.map((audit, idx) => (
                  <tr
                    key={audit.id}
                    className={`hover:bg-primary/5 transition-colors cursor-pointer ${idx % 2 === 1 ? "bg-zebra" : ""}`}
                  >
                    <td className="py-4 px-6 font-data-mono">{audit.id}</td>
                    <td className="py-4 px-6 font-medium">
                      {audit.institution}
                    </td>
                    <td className="py-4 px-6">
                      <StatusPill status={audit.status} />
                    </td>
                    <td className="py-4 px-6 text-right font-data-mono text-on-surface-variant/60">
                      {audit.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Tasks */}
        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline-sm">Priority Tasks</h2>
            <div className="flex -space-x-2">
              <span className="w-8 h-8 rounded-full border-2 border-white bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                12+
              </span>
            </div>
          </div>
          <div className="space-y-4 h-[280px] overflow-y-auto custom-scrollbar pr-2">
            {priorityTasks.map((task, idx) => (
              <div
                key={idx}
                className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-lg flex items-start gap-4 group cursor-pointer hover:border-primary/40 transition-all"
              >
                <div
                  className={`mt-1 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${task.urgent ? "bg-tertiary-container/10 text-tertiary" : "bg-secondary/10 text-secondary"}`}
                >
                  <span className="material-symbols-outlined">
                    {task.urgent ? "priority_high" : "task"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold font-body-md text-on-surface group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                  <p className="font-label-md text-on-surface-variant/70 mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <span
                      className={`font-data-mono text-[11px] px-2 py-0.5 rounded ${task.urgent ? "text-tertiary bg-tertiary/5" : "text-secondary bg-secondary/5"}`}
                    >
                      {task.due}
                    </span>
                    <span className="flex items-center gap-1 text-on-surface-variant/40 text-[11px] font-medium">
                      <span className="material-symbols-outlined text-[14px]">
                        account_circle
                      </span>
                      Lead: {task.lead}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
