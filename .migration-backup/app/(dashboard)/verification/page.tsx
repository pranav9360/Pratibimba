import Link from "next/link";
import Image from "next/image";
import { StatusPill, PriorityBadge } from "@/components/status-pill";

const stats = [
  { label: "Pending Reviews", value: "42", change: "+4%", icon: "pending_actions", color: "primary" },
  { label: "Approved Audits", value: "1,284", change: "+12%", icon: "check_circle", color: "secondary" },
  { label: "Rejected Audits", value: "86", change: "-2%", icon: "cancel", color: "tertiary" },
  { label: "Escalated Cases", value: "14", change: "8 New", icon: "warning", color: "on-secondary-container" },
  { label: "Avg. Review Time", value: "3.2", unit: "hrs", target: "Target: 4h", icon: "timer", color: "outline" },
];

const queueItems = [
  { id: "#AUD-9042", title: "Q3 Fiscal Integrity Audit", submitter: "Anita Rao", dept: "Finance", date: "2023-10-24 09:15", priority: "high" as const, status: "pending" as const },
  { id: "#AUD-8831", title: "Employee Benefit Compliance", submitter: "Rohan Mehra", dept: "HR", date: "2023-10-23 16:45", priority: "medium" as const, status: "in-review" as const },
  { id: "#AUD-9015", title: "Data Privacy Protocol Review", submitter: "Sarah Chen", dept: "IT Support", date: "2023-10-23 11:20", priority: "low" as const, status: "pending" as const },
  { id: "#AUD-8992", title: "Vendor Contract Assessment", submitter: "Marcus Thorne", dept: "Procurement", date: "2023-10-22 14:00", priority: "high" as const, status: "pending" as const },
];

const recentActivity = [
  { action: "Verified", audit: "#AUD-8810", user: "Vikram Singh", time: "2 hours ago" },
  { action: "Rejected", audit: "#AUD-8805", user: "Ananya Iyer", time: "4 hours ago" },
  { action: "Escalated", audit: "#AUD-8799", user: "System", time: "Yesterday" },
];

export default function VerificationQueuePage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">Verification Queue</h2>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-surface-container-lowest p-6 rounded-xl shadow-soft border-l-4 border-${stat.color}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`material-symbols-outlined text-${stat.color}`}>
                {stat.icon}
              </span>
              <span className={`text-${stat.color} font-bold font-data-mono`}>
                {stat.change || stat.target}
              </span>
            </div>
            <p className="font-label-md text-on-surface-variant">{stat.label}</p>
            <p className="font-display-lg text-on-surface">
              {stat.value}
              {stat.unit && (
                <span className="font-headline-sm font-normal ml-1">
                  {stat.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Pending Verification Table */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-soft overflow-hidden flex flex-col min-h-[600px]">
            {/* Table Toolbar */}
            <div className="p-6 border-b border-surface-container flex flex-wrap justify-between items-center gap-4">
              <h3 className="font-headline-sm text-on-surface">
                Active Verification Queue
              </h3>
              <div className="flex gap-4">
                <select className="bg-surface border border-outline-variant font-body-md rounded-lg px-4 py-1 focus:ring-primary/20">
                  <option>Priority: All</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <select className="bg-surface border border-outline-variant font-body-md rounded-lg px-4 py-1 focus:ring-primary/20">
                  <option>Department: All</option>
                  <option>Finance</option>
                  <option>Operations</option>
                  <option>HR</option>
                </select>
                <button className="flex items-center gap-1 px-4 py-1 bg-surface border border-outline-variant rounded-lg hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    filter_list
                  </span>
                  <span className="font-label-md font-medium">More Filters</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Audit ID
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Audit Title
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Dept.
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Submission
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="font-body-md">
                  {queueItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-surface-variant hover:bg-primary-fixed/10 transition-colors ${idx % 2 === 1 ? "bg-zebra" : ""}`}
                    >
                      <td className="px-6 py-6 font-data-mono font-bold text-primary">
                        {item.id}
                      </td>
                      <td className="px-6 py-6">
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[11px] leading-tight text-on-surface-variant/80 mt-1">
                          Submitted by {item.submitter}
                        </p>
                      </td>
                      <td className="px-6 py-6">{item.dept}</td>
                      <td className="px-6 py-6 font-data-mono text-[12px]">
                        {item.date}
                      </td>
                      <td className="px-6 py-6">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="px-6 py-6">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 hover:bg-secondary-container/20 border border-outline-variant/30 rounded-lg text-secondary transition-colors"
                            title="Verify"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              check_circle
                            </span>
                          </button>
                          <button
                            className="p-1.5 hover:bg-error-container/20 border border-outline-variant/30 rounded-lg text-tertiary transition-colors"
                            title="Reject"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              cancel
                            </span>
                          </button>
                          <button className="p-1.5 hover:bg-surface-variant border border-outline-variant/30 rounded-lg text-on-surface-variant transition-colors">
                            <span className="material-symbols-outlined text-[18px]">
                              more_vert
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-xl shadow-soft">
            <h3 className="font-headline-sm text-on-surface mb-4">
              Today&apos;s Progress
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-label-md mb-1">
                  <span>Reviews Completed</span>
                  <span className="font-bold">18/25</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[72%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-label-md mb-1">
                  <span>Escalations Resolved</span>
                  <span className="font-bold">4/6</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[67%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-xl shadow-soft">
            <h3 className="font-headline-sm text-on-surface mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 pb-4 border-b border-outline-variant/20 last:border-0 last:pb-0"
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      activity.action === "Verified"
                        ? "text-secondary"
                        : activity.action === "Rejected"
                          ? "text-error"
                          : "text-tertiary"
                    }`}
                  >
                    {activity.action === "Verified"
                      ? "check_circle"
                      : activity.action === "Rejected"
                        ? "cancel"
                        : "warning"}
                  </span>
                  <div className="flex-1">
                    <p className="font-body-md">
                      <span className="font-bold">{activity.action}</span>{" "}
                      <Link
                        href={`/audits/${activity.audit.replace("#", "")}`}
                        className="text-primary hover:underline"
                      >
                        {activity.audit}
                      </Link>
                    </p>
                    <p className="font-label-md text-on-surface-variant">
                      {activity.user} - {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
