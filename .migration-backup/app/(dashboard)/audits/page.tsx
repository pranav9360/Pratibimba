import Link from "next/link";
import { StatusPill, PriorityBadge } from "@/components/status-pill";

const stats = [
  { label: "Total Logs", value: "4,821" },
  { label: "Flagged", value: "124", color: "error" as const, dot: true },
  { label: "Pending", value: "342", color: "primary" as const, dot: true },
  { label: "Verified", value: "1,102", color: "secondary-container" as const, change: "+8%" },
  { label: "Escalated", value: "12", color: "tertiary" as const, dot: true },
];

const audits = [
  { id: "#AUD-8921", type: "Compliance", dept: "Diagnostics", auditor: "Dr. Sarah J.", date: "2023-11-24", status: "verified" as const, priority: "high" as const },
  { id: "#AUD-8922", type: "Financial", dept: "HR & Admin", auditor: "Marcus Thorne", date: "2023-11-25", status: "pending" as const, priority: "medium" as const },
  { id: "#AUD-8923", type: "Safety", dept: "IT Infrastructure", auditor: "Dr. Sarah J.", date: "2023-11-25", status: "failed" as const, priority: "high" as const },
  { id: "#AUD-8924", type: "Compliance", dept: "Operations", auditor: "Anita Rao", date: "2023-11-26", status: "pending" as const, priority: "low" as const },
  { id: "#AUD-8925", type: "Financial", dept: "Diagnostics", auditor: "Rohan Mehra", date: "2023-11-26", status: "in-review" as const, priority: "medium" as const },
  { id: "#AUD-8926", type: "Safety", dept: "HR & Admin", auditor: "Marcus Thorne", date: "2023-11-27", status: "verified" as const, priority: "low" as const },
];

export default function AuditLogsPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Success Toast */}
      <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center gap-4 shadow-sm">
        <span className="material-symbols-outlined text-green-600">
          check_circle
        </span>
        <div className="flex-1">
          <p className="font-label-md font-semibold">
            Audit submitted successfully
          </p>
          <p className="text-[12px] opacity-90">
            #AUD-8926 has been added to the queue.
          </p>
        </div>
        <button className="material-symbols-outlined text-green-600 hover:bg-green-100 rounded-full p-1">
          close
        </button>
      </div>

      {/* Header */}
      <section>
        <h2 className="font-headline-md text-on-surface">Audit Logs</h2>
      </section>

      {/* Statistics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20 ${stat.color ? `border-l-4 border-l-${stat.color}` : ""}`}
          >
            <p className="font-label-md text-on-surface-variant flex items-center gap-2">
              {stat.label}
              {stat.dot && (
                <span className={`w-2 h-2 rounded-full bg-${stat.color}`} />
              )}
            </p>
            <div className="flex items-baseline gap-2">
              <p
                className={`font-display-lg mt-1 ${stat.color === "error" ? "text-error" : stat.color === "primary" ? "text-primary" : stat.color === "tertiary" ? "text-tertiary" : "text-on-surface"}`}
              >
                {stat.value}
              </p>
              {stat.change && (
                <span className="font-label-md text-secondary font-bold">
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Search & Filters Card */}
      <section className="bg-white rounded-xl p-6 border border-outline-variant/20 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Date Range
              </label>
              <select className="w-full rounded-lg border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all">
                <option>Last 30 Days</option>
                <option>This Quarter</option>
                <option>Year to Date</option>
                <option>Custom Range</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Audit Type
              </label>
              <select className="w-full rounded-lg border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all">
                <option>All Types</option>
                <option>Financial</option>
                <option>Safety</option>
                <option>Compliance</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Status
              </label>
              <select className="w-full rounded-lg border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all">
                <option>All Statuses</option>
                <option>Pending</option>
                <option>Verified</option>
                <option>Failed</option>
                <option>Escalated</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Department
              </label>
              <select className="w-full rounded-lg border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all">
                <option>All Departments</option>
                <option>Diagnostics</option>
                <option>IT Infrastructure</option>
                <option>HR & Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button className="bg-primary text-on-primary px-8 py-2.5 rounded-lg font-label-md shadow-sm transition-all hover:shadow-md hover:brightness-110 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                filter_alt
              </span>
              Apply Filters
            </button>
            <button className="text-on-surface-variant/70 hover:text-primary font-label-md px-2 py-2 transition-colors">
              Clear Filters
            </button>
          </div>
        </div>
      </section>

      {/* Audit Logs Table */}
      <div className="bg-white border border-outline-variant/20 shadow-soft rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-outline-variant">
              <tr className="bg-zebra">
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer">
                    Audit ID
                    <span className="material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </div>
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Department
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Auditor
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Submission
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Priority
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {audits.map((audit, idx) => (
                <tr
                  key={audit.id}
                  className={`hover:bg-surface-container-low transition-colors cursor-pointer ${idx % 2 === 1 ? "bg-zebra" : ""}`}
                >
                  <td className="font-data-mono font-bold text-primary px-4 py-4">
                    {audit.id}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {audit.type}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {audit.dept}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {audit.auditor}
                  </td>
                  <td className="font-data-mono text-on-surface-variant px-4 py-4">
                    {audit.date}
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill status={audit.status} />
                  </td>
                  <td className="px-4 py-4">
                    <PriorityBadge priority={audit.priority} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Link href={`/audits/${audit.id.replace("#", "")}`}>
                        <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
                          visibility
                        </button>
                      </Link>
                      <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
                        edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant/20 flex justify-between items-center">
          <p className="font-label-md text-on-surface-variant">
            Showing 1-6 of 4,821 entries
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md">
              1
            </button>
            <button className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">
              2
            </button>
            <button className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">
              3
            </button>
            <button className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
