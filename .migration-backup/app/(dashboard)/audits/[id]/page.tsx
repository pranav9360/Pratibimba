import Image from "next/image";
import Link from "next/link";
import { StatusPill, PriorityBadge } from "@/components/status-pill";

// This would normally come from a database
const auditData = {
  id: "AUD-8921",
  status: "pending" as const,
  department: "Diagnostics / Lab A",
  auditor: "Dr. Sarah J.",
  priority: "high" as const,
  submitted: "24/10/2023",
  findings: `During the semi-annual inspection of Laboratory Wing A (Diagnostics), several inconsistencies were noted regarding the storage temperatures of critical reagent batches. Specifically, Batch #XG-902 was stored at 6°C, which exceeds the mandatory 2-4°C range stipulated in the Biosafety Protocol v4.2.

The secondary containment unit showed signs of condensation, suggesting a potential seal failure in the cooling system. Immediate recalibration of the digital thermometer is recommended.`,
  checklist: [
    { task: "Verify reagent storage logs", completed: true, note: "Logs have been cross-checked with the digital backup." },
    { task: "Check containment seal integrity", completed: true, note: "Visual inspection completed by Maintenance Team." },
    { task: "Recalibrate digital thermometer", completed: false, note: "Pending specialist visit on 28/10." },
  ],
  attachments: [
    { name: "Safety_Report_LabA.pdf", type: "PDF", size: "2.4 MB" },
    { name: "Site_Photo_01.jpg", type: "IMG", size: "1.1 MB", hasImage: true },
    { name: "Temp_Display_Log.jpg", type: "IMG", size: "0.8 MB", hasImage: true },
    { name: "Compliance_Certificate.pdf", type: "PDF", size: "1.2 MB" },
  ],
  timeline: [
    { status: "Submitted", date: "24 Oct, 09:15", user: "Dr. Sarah J." },
    { status: "Initial Review", date: "24 Oct, 11:30", user: "System" },
    { status: "Pending Verification", date: "24 Oct, 14:00", user: "Ananya I." },
  ],
};

export default function AuditDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 font-label-md text-on-surface-variant mb-2">
            <Link href="/audits" className="hover:text-primary">
              Audit Logs
            </Link>
            <span className="material-symbols-outlined text-[14px]">
              chevron_right
            </span>
            <span className="font-bold text-primary">#{auditData.id}</span>
          </nav>
          <h2 className="font-headline-md text-on-surface">
            Audit Details: #{auditData.id}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-surface-container-highest text-on-surface font-label-md font-bold rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Download Report
          </button>
          <button className="px-4 py-2 bg-primary text-on-primary font-label-md font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">
              check_circle
            </span>
            Verify Audit
          </button>
          <button className="px-4 py-2 bg-error-container text-on-error-container font-label-md font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">cancel</span>
            Reject Audit
          </button>
          <button className="p-2 bg-surface-container-highest text-on-surface rounded-lg hover:text-primary transition-colors">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden border-l-8 border-primary-container">
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="space-y-1">
            <span className="font-label-md text-on-surface-variant">
              Current Status
            </span>
            <div className="flex items-center gap-2">
              <StatusPill status="pending" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-label-md text-on-surface-variant">
              Department
            </span>
            <p className="font-body-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">
                medical_services
              </span>
              {auditData.department}
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-label-md text-on-surface-variant">
              Assigned Auditor
            </span>
            <p className="font-body-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">
                person
              </span>
              {auditData.auditor}
            </p>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-8">
            <div className="space-y-1">
              <span className="font-label-md text-on-surface-variant">
                Priority
              </span>
              <PriorityBadge priority="high" />
            </div>
            <div className="text-right">
              <span className="font-label-md text-on-surface-variant">
                Submitted
              </span>
              <p className="font-data-mono text-on-surface">
                {auditData.submitted}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Findings & Observations */}
          <section className="bg-white p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-on-surface">
                Findings & Observations
              </h3>
              <button className="text-primary font-label-md flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Section
              </button>
            </div>
            <div className="space-y-4 font-body-md text-on-surface-variant leading-relaxed">
              {auditData.findings.split("\n\n").map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* Verification Checklist */}
            <div className="mt-8 pt-6 border-t border-surface-variant">
              <h4 className="font-label-md text-on-surface font-bold mb-4 uppercase tracking-wider">
                Verification Checklist
              </h4>
              <ul className="space-y-2">
                {auditData.checklist.map((item, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg ${item.completed ? "bg-surface-container-low" : "border border-outline-variant/30"}`}
                  >
                    <span
                      className={`material-symbols-outlined ${item.completed ? "text-primary filled" : "text-on-surface-variant"}`}
                    >
                      {item.completed ? "check_box" : "check_box_outline_blank"}
                    </span>
                    <div>
                      <p
                        className={`font-body-md font-bold ${item.completed ? "text-on-surface" : "text-on-surface-variant"}`}
                      >
                        {item.task}
                      </p>
                      <p className="font-label-md text-on-surface-variant">
                        {item.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Attached Evidence */}
          <section className="bg-white p-6 rounded-xl shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-on-surface">
                Attached Evidence
              </h3>
              <span className="font-label-md text-on-surface-variant">
                {auditData.attachments.length} Files Attached
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {auditData.attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
                    <span className="material-symbols-outlined">
                      {file.type === "PDF" ? "picture_as_pdf" : "image"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md font-bold text-on-surface truncate">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase">
                      {file.type} - {file.size}
                    </p>
                  </div>
                  <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant">
                    visibility
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Audit Timeline */}
          <section className="bg-white p-6 rounded-xl shadow-soft">
            <h3 className="font-headline-sm text-on-surface mb-4">
              Audit Timeline
            </h3>
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline-variant/30" />

              {auditData.timeline.map((event, idx) => (
                <div key={idx} className="relative pb-6 last:pb-0">
                  <div className="absolute left-[-18px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                  <div>
                    <p className="font-body-md font-bold text-on-surface">
                      {event.status}
                    </p>
                    <p className="font-data-mono text-[11px] text-on-surface-variant">
                      {event.date}
                    </p>
                    <p className="font-label-md text-on-surface-variant mt-1">
                      By: {event.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-secondary p-6 rounded-xl text-on-secondary">
            <h3 className="font-headline-sm mb-2">Need Assistance?</h3>
            <p className="font-body-md text-on-secondary/80 mb-6">
              Contact the compliance team for urgent queries or escalation
              requests.
            </p>
            <button className="w-full py-3 bg-white text-secondary font-bold rounded-lg hover:bg-secondary-fixed transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">support_agent</span>
              Contact Support
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
