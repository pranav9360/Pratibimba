import { StatusPill, PriorityBadge } from "../components/status-pill";

const stats = [
  { label: "Pending Reviews", value: "42", change: "+4%", icon: "pending_actions", borderColor: "border-primary" },
  { label: "Approved Audits", value: "1,284", change: "+12%", icon: "check_circle", borderColor: "border-secondary" },
  { label: "Rejected Audits", value: "86", change: "-2%", icon: "cancel", borderColor: "border-tertiary" },
  { label: "Escalated Cases", value: "14", change: "8 New", icon: "warning", borderColor: "border-on-secondary-container" },
  { label: "Avg. Review Time", value: "3.2", unit: "hrs", change: "Target: 4h", icon: "timer", borderColor: "border-outline" },
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
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">Verification Queue</h2>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-surface-container-lowest p-6 rounded-xl shadow-soft border-l-4 ${stat.borderColor}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="material-symbols-outlined text-on-surface-variant">{stat.icon}</span>
              <span className="font-bold font-data-mono text-on-surface-variant">{stat.change}</span>
            </div>
            <p className="font-label-md text-on-surface-variant">{stat.label}</p>
            <p className="font-display-lg text-on-surface">
              {stat.value}
              {stat.unit && <span className="font-headline-sm font-normal ml-1">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-soft overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-surface-container flex flex-wrap justify-between items-center gap-4">
              <h3 className="font-headline-sm text-on-surface">Active Verification Queue</h3>
              <div className="flex gap-4">
                <select className="bg-surface border border-outline-variant font-body-md rounded-lg px-4 py-1 outline-none">
                  <option>Priority: All</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <select className="bg-surface border border-outline-variant font-body-md rounded-lg px-4 py-1 outline-none">
                  <option>Department: All</option>
                  <option>Finance</option>
                  <option>Operations</option>
                  <option>HR</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-surface-variant">
                  <tr>
                    {["Audit ID", "Audit Title", "Dept.", "Submission", "Priority", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-body-md">
                  {queueItems.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-surface-variant hover:bg-primary-fixed/10 transition-colors ${idx % 2 === 1 ? "bg-zebra" : ""}`}>
                      <td className="px-6 py-6 font-data-mono font-bold text-primary">{item.id}</td>
                      <td className="px-6 py-6">
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[11px] leading-tight text-on-surface-variant/80 mt-1">Submitted by {item.submitter}</p>
                      </td>
                      <td className="px-6 py-6 font-body-md">{item.dept}</td>
                      <td className="px-6 py-6 font-data-mono text-[11px]">{item.date}</td>
                      <td className="px-6 py-6"><PriorityBadge priority={item.priority} /></td>
                      <td className="px-6 py-6"><StatusPill status={item.status} /></td>
                      <td className="px-6 py-6">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-secondary text-white rounded-lg font-label-md font-bold hover:bg-secondary/90 transition-all">Approve</button>
                          <button className="px-3 py-1.5 border border-tertiary text-tertiary rounded-lg font-label-md font-bold hover:bg-tertiary/5 transition-all">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-soft p-6 space-y-4 h-fit">
          <h3 className="font-headline-sm text-on-surface">Recent Activity</h3>
          {recentActivity.map((act, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-4 border-b border-outline-variant/20 last:border-0 last:pb-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.action === "Verified" ? "bg-secondary/10 text-secondary" : act.action === "Rejected" ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"}`}>
                <span className="material-symbols-outlined text-[16px]">
                  {act.action === "Verified" ? "check_circle" : act.action === "Rejected" ? "cancel" : "priority_high"}
                </span>
              </div>
              <div>
                <p className="font-label-md font-bold text-on-surface">{act.action}: {act.audit}</p>
                <p className="font-label-md text-on-surface-variant/70">{act.user} · {act.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
