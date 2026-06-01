import { Link } from "wouter";
import { StatusPill } from "../components/status-pill";

export default function AuditDetailPage() {
  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit: #AUD-8921</h2>
          <p className="font-body-md text-on-surface-variant mt-1">Laboratory Safety Audit – Wing A | Diagnostics Department</p>
        </div>
        <StatusPill status="verified" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 space-y-6">
          <h3 className="font-headline-sm">Audit Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Audit ID", value: "#AUD-8921" },
              { label: "Type", value: "Compliance" },
              { label: "Department", value: "Diagnostics" },
              { label: "Auditor", value: "Dr. Sarah J." },
              { label: "Date", value: "Nov 24, 2023" },
              { label: "Priority", value: "High" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 space-y-4">
          <h3 className="font-headline-sm">Quick Actions</h3>
          {[
            { label: "Download Report", icon: "download" },
            { label: "View Timeline", icon: "timeline" },
            { label: "Escalate Case", icon: "priority_high" },
          ].map((action) => (
            <button key={action.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low transition-colors font-body-md">
              <span className="material-symbols-outlined text-primary">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10">
        <h3 className="font-headline-sm mb-4">Findings Summary</h3>
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          The laboratory safety audit for Wing A was conducted on November 24, 2023. All standard protocols were followed and documented. The audit revealed full compliance with safety standards, with minor recommendations for equipment calibration schedules.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/audits">
          <button className="flex items-center gap-2 px-6 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Audit Logs
          </button>
        </Link>
      </div>
    </div>
  );
}
