import { useState, useMemo } from "react";
import { useApp, PRAKALPAS, AUDITORS, AUDIT_AREAS, AUDIT_COORDINATORS, type Report, type ScheduledAudit } from "../context/app-context";

function downloadCSV(reports: Report[]) {
  const headers = ["Report ID (IAR)", "IQA Ref", "Prakalpa", "Location", "Prakalpa Pramukh", "Internal Audit Date", "Audit Area", "Audit Findings", "Classification", "Audit Coordinator", "Status", "Corrective Action", "Date Closed", "Due Date"];
  const rows = reports.map((r) => [
    r.iarNumber, r.iqaNumber, r.prakalpa, r.location || "", r.prakalphaPramukh || "",
    r.visitDate, r.auditArea || "", `"${(r.findings || "").replace(/"/g, '""')}"`,
    r.severity === "non_conformance" ? "NC" : "OFI",
    r.auditCoordinator || "", r.status,
    `"${(r.correctiveAction || r.actionTaken || "").replace(/"/g, '""')}"`,
    r.dateClosed || "", r.dueDate || "",
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `AllReports_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface AddReportModalProps {
  scheduledAudits: ScheduledAudit[];
  onClose: () => void;
  onSave: (data: Omit<Report, "id" | "iarNumber" | "iqrNumber" | "createdDate" | "status">) => void;
}

function AddReportModal({ scheduledAudits, onClose, onSave }: AddReportModalProps) {
  const [form, setForm] = useState({
    iqaNumber: scheduledAudits[0]?.iqaNumber || "",
    location: "",
    visitDate: new Date().toISOString().split("T")[0],
    visitTime: "10:00 AM",
    auditArea: AUDIT_AREAS[0],
    findings: "",
    severity: "open_for_improvement" as "open_for_improvement" | "non_conformance",
    classificationStatus: "OFI",
    dueDate: "",
    correctiveAction: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const selectedAudit = scheduledAudits.find((a) => a.iqaNumber === form.iqaNumber);
  const locations = selectedAudit?.location ? [selectedAudit.location] : [];

  const handleSave = () => {
    if (!form.iqaNumber || !form.findings.trim()) return;
    onSave({
      iqaNumber: form.iqaNumber,
      prakalpa: selectedAudit?.prakalpa || "",
      location: form.location || selectedAudit?.location,
      auditor: selectedAudit?.finalAuditor || "",
      auditCoordinator: selectedAudit?.auditCoordinator,
      prakalphaPramukh: selectedAudit?.prakalphaPramukh,
      auditArea: form.auditArea,
      visitDate: form.visitDate,
      visitTime: form.visitTime,
      severity: form.severity,
      findings: form.findings,
      classificationStatus: form.classificationStatus,
      correctiveAction: form.correctiveAction,
      dueDate: form.dueDate,
      proofFiles: [],
      hasChecklist: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-xl z-10 max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 shrink-0">
          <h3 className="font-headline-sm">Add New Report</h3>
          <p className="font-label-md text-on-surface-variant/60 mt-0.5">Report ID (IAR) will be auto-generated</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit ID (IQA Number) <span className="text-error">*</span></label>
            <select value={form.iqaNumber} onChange={(e) => { set("iqaNumber", e.target.value); set("location", ""); }} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {scheduledAudits.map((a) => (
                <option key={a.id} value={a.iqaNumber}>{a.iqaNumber} — {a.prakalpa}</option>
              ))}
            </select>
            {selectedAudit && (
              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                {selectedAudit.prakalpa}{selectedAudit.location ? ` · ${selectedAudit.location}` : ""} · Coordinator: {selectedAudit.auditCoordinator}
              </p>
            )}
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Location</label>
            <select value={form.location} onChange={(e) => set("location", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              <option value="">— Select —</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Internal Audit Date <span className="text-error">*</span></label>
              <input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Area <span className="text-error">*</span></label>
            <select value={form.auditArea} onChange={(e) => set("auditArea", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {AUDIT_AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Classification <span className="text-error">*</span></label>
            <div className="flex gap-3">
              {([["open_for_improvement", "OFI", "Open for Improvement"], ["non_conformance", "NC", "Non-Conformance"]] as const).map(([val, code, label]) => (
                <button key={val} type="button" onClick={() => { set("severity", val); set("classificationStatus", code); }}
                  className={`flex-1 py-2.5 rounded-lg font-label-md font-bold border-2 transition-all ${form.severity === val ? (val === "non_conformance" ? "bg-error/10 border-error text-error" : "bg-primary/10 border-primary text-primary") : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}>
                  {code} — {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Findings <span className="text-error">*</span></label>
            <textarea value={form.findings} onChange={(e) => set("findings", e.target.value)} rows={4} placeholder="Describe the audit findings..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Corrective Action</label>
            <textarea value={form.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} rows={2} placeholder="Describe corrective action if any..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 border-t border-outline-variant/10 mt-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button disabled={!form.iqaNumber || !form.findings.trim()} onClick={handleSave} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold disabled:opacity-40">Create Report</button>
        </div>
      </div>
    </div>
  );
}

interface ActionModalProps {
  report: Report;
  onClose: () => void;
  onSave: (action: string) => void;
}

function ActionModal({ report, onClose, onSave }: ActionModalProps) {
  const [action, setAction] = useState(report.actionTaken || "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Add Action Taken</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">{report.iarNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{report.prakalpa}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-surface-container-lowest rounded-lg p-4 space-y-2">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Audit Findings</p>
            <p className="font-body-md text-on-surface">{report.findings}</p>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Action Taken</label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={4} placeholder="Describe the corrective action taken..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button disabled={!action.trim()} onClick={() => onSave(action)} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold disabled:opacity-40">Save Action</button>
        </div>
      </div>
    </div>
  );
}

interface DetailModalProps {
  report: Report;
  onClose: () => void;
}

function DetailModal({ report, onClose }: DetailModalProps) {
  const { getDaysOpen, isRedFlagged } = useApp();
  const days = getDaysOpen(report);
  const flagged = isRedFlagged(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`p-6 border-b ${flagged ? "bg-error/5 border-error/20" : "border-outline-variant/10"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-data-mono text-[13px] text-primary font-black">{report.iarNumber}</span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">IQA: {report.iqaNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{report.status}</span>
                {flagged && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/10 text-error">🚨 Red Flagged</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Prakalpa", value: report.prakalpa },
              { label: "Location", value: report.location || "—" },
              { label: "Prakalpa Pramukh", value: report.prakalphaPramukh || "—" },
              { label: "Auditor", value: report.auditor },
              { label: "Coordinator", value: report.auditCoordinator || "—" },
              { label: "Audit Area", value: report.auditArea || "—" },
              { label: "Internal Audit Date", value: new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
              { label: "Due Date", value: report.dueDate ? new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
              { label: "Date Closed", value: report.dateClosed ? new Date(report.dateClosed).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
              { label: "Days Open", value: report.status === "open" ? `${days} days` : "Closed" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-1">Classification</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-label-md font-bold ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
              <span className="material-symbols-outlined text-[16px]">{report.severity === "non_conformance" ? "error_outline" : "info"}</span>
              {report.severity === "non_conformance" ? "Non-Conformance (NC)" : "Open for Improvement (OFI)"}
            </span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-2">Audit Findings</p>
            <div className="bg-surface-container-lowest rounded-lg p-4 font-body-md text-on-surface leading-relaxed">{report.findings}</div>
          </div>
          {(report.correctiveAction || report.actionTaken) && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">Corrective Action</p>
              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 font-body-md text-on-surface leading-relaxed">{report.correctiveAction || report.actionTaken}</div>
            </div>
          )}
          {report.proofFiles.length > 0 && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">Proof / Evidence</p>
              <div className="flex flex-wrap gap-2">
                {report.proofFiles.map((f) => (
                  <div key={f} className="flex items-center gap-2 px-3 py-2 bg-secondary/5 border border-secondary/20 rounded-lg">
                    <span className="material-symbols-outlined text-secondary text-[16px]">attach_file</span>
                    <span className="font-label-md text-secondary">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.iqaReportPdf && (
            <div className="flex items-center gap-2 text-secondary font-label-md">
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              IQA Report: {report.iqaReportPdf}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AllReportsPage() {
  const { reports, scheduledAudits, currentUser, getDaysOpen, isRedFlagged, isOverdue, updateReport, addActionTaken, closeReport, createReport } = useApp();
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Report | null>(null);
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [filterAuditId, setFilterAuditId] = useState("");
  const [filterReportId, setFilterReportId] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("");
  const [filterAuditDate, setFilterAuditDate] = useState("");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const isChief = currentUser.role === "chief_auditor";
  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";

  const allLocations = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => { if (r.location) s.add(r.location); });
    return Array.from(s);
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch = search === "" || r.iarNumber.toLowerCase().includes(search.toLowerCase()) || r.iqaNumber.toLowerCase().includes(search.toLowerCase()) || r.prakalpa.toLowerCase().includes(search.toLowerCase()) || (r.findings || "").toLowerCase().includes(search.toLowerCase());
      const matchAuditId = filterAuditId === "" || r.iqaNumber.toLowerCase().includes(filterAuditId.toLowerCase());
      const matchReportId = filterReportId === "" || r.iarNumber.toLowerCase().includes(filterReportId.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || r.prakalpa === filterPrakalpa;
      const matchLocation = filterLocation === "All" || r.location === filterLocation;
      const matchPramukh = filterPramukh === "" || (r.prakalphaPramukh || "").toLowerCase().includes(filterPramukh.toLowerCase());
      const matchAuditDate = filterAuditDate === "" || r.visitDate === filterAuditDate;
      const matchArea = filterAuditArea === "All" || r.auditArea === filterAuditArea;
      const matchClass = filterClassification === "All" || (filterClassification === "NC" ? r.severity === "non_conformance" : r.severity === "open_for_improvement");
      const matchCoord = filterCoordinator === "All" || r.auditCoordinator === filterCoordinator;
      const matchStatus = filterStatus === "All" || r.status === filterStatus.toLowerCase();
      const matchUser = isManager ? r.prakalpa === currentUser.prakalpa : isAuditor ? r.auditor === currentUser.auditorName : true;
      return matchSearch && matchAuditId && matchReportId && matchPrakalpa && matchLocation && matchPramukh && matchAuditDate && matchArea && matchClass && matchCoord && matchStatus && matchUser;
    });
  }, [reports, search, filterAuditId, filterReportId, filterPrakalpa, filterLocation, filterPramukh, filterAuditDate, filterAuditArea, filterClassification, filterCoordinator, filterStatus, isManager, isAuditor, currentUser]);

  const clearFilters = () => {
    setSearch(""); setFilterAuditId(""); setFilterReportId(""); setFilterPrakalpa("All");
    setFilterLocation("All"); setFilterPramukh(""); setFilterAuditDate(""); setFilterAuditArea("All");
    setFilterClassification("All"); setFilterCoordinator("All"); setFilterStatus("All");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">All Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} reports {isManager ? `for ${currentUser.prakalpa}` : ""}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => downloadCSV(filtered)} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download
          </button>
          {(isChief || isAuditor) && (
            <button onClick={() => setAddReportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add New Report
            </button>
          )}
        </div>
      </div>

      {reports.filter(isRedFlagged).length > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-error text-[24px]">flag</span>
          <div>
            <p className="font-label-md font-bold text-error">{reports.filter(isRedFlagged).length} Non-Conformance reports open for more than 30 days</p>
            <p className="font-label-md text-error/70">These require immediate attention.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
            <input type="text" placeholder="Search reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
          </div>
          <input type="text" placeholder="Audit ID" value={filterAuditId} onChange={(e) => setFilterAuditId(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
          <input type="text" placeholder="Report ID (IAR)" value={filterReportId} onChange={(e) => setFilterReportId(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
          {!isManager && (
            <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
              <option value="All">All Prakalpa</option>
              {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Locations</option>
            {allLocations.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Prakalpa Pramukh" value={filterPramukh} onChange={(e) => setFilterPramukh(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-44" />
          <input type="date" value={filterAuditDate} onChange={(e) => setFilterAuditDate(e.target.value)} title="Internal Audit Date" className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none" />
          <select value={filterAuditArea} onChange={(e) => setFilterAuditArea(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Audit Areas</option>
            {AUDIT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Classification</option>
            <option value="NC">NC — Non-Conformance</option>
            <option value="OFI">OFI — Open for Improvement</option>
          </select>
          <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Coordinators</option>
            {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <button onClick={clearFilters} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">fact_check</span>
          <p className="font-headline-sm text-on-surface-variant/40">No reports found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0">
                <tr>
                  {["Report ID", "Audit ID", "Prakalpa", "Location", "Pramukh", "Audit Date", "Audit Area", "Classification", "Coordinator", "Status", "Due Date", "Corrective Action", "Date Closed", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, idx) => {
                  const days = getDaysOpen(report);
                  const flagged = isRedFlagged(report);
                  const overdue = isOverdue(report);
                  return (
                    <tr
                      key={report.id}
                      onClick={() => setDetailTarget(report)}
                      className={`transition-colors cursor-pointer ${flagged ? "bg-error/5 hover:bg-error/10" : idx % 2 === 1 ? "bg-surface-container-lowest/50 hover:bg-surface-container-low" : "hover:bg-surface-container-low"}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {flagged && <span className="material-symbols-outlined text-error text-[14px]">flag</span>}
                          <span className="font-data-mono text-[12px] text-primary font-bold">{report.iarNumber}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-data-mono text-[11px] text-on-surface-variant whitespace-nowrap">{report.iqaNumber}</td>
                      <td className="px-3 py-3 font-body-md font-medium text-on-surface whitespace-nowrap">{report.prakalpa}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.location || "—"}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.prakalphaPramukh || "—"}</td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">{new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.auditArea || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                          {report.severity === "non_conformance" ? "NC" : "OFI"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.auditCoordinator || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase whitespace-nowrap ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{report.status}</span>
                      </td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">
                        {report.dueDate ? (
                          <span className={overdue ? "text-error font-bold" : "text-on-surface-variant"}>
                            {new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            {overdue && " ⚠"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <p className="font-label-md text-on-surface-variant line-clamp-1 text-[11px]">{report.correctiveAction || report.actionTaken || "—"}</p>
                      </td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                        {report.dateClosed ? new Date(report.dateClosed).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isManager && report.status === "open" && (
                            <button onClick={() => setActionTarget(report)} title="Add Action" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                              <span className="material-symbols-outlined text-[18px]">add_task</span>
                            </button>
                          )}
                          {(isChief || (isAuditor && report.auditor === currentUser.auditorName)) && report.status === "open" && (
                            <button onClick={() => closeReport(report.id)} title="Close" className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
            <span>Showing {filtered.length} of {reports.length} reports</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40" />Open: {reports.filter(r => r.status === "open").length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary/40" />Closed: {reports.filter(r => r.status === "closed").length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error/60" />Flagged: {reports.filter(isRedFlagged).length}</span>
            </div>
          </div>
        </div>
      )}

      {addReportOpen && (
        <AddReportModal
          scheduledAudits={scheduledAudits}
          onClose={() => setAddReportOpen(false)}
          onSave={(data) => { createReport(data); setAddReportOpen(false); }}
        />
      )}
      {actionTarget && (
        <ActionModal
          report={actionTarget}
          onClose={() => setActionTarget(null)}
          onSave={(action) => { addActionTaken(actionTarget.id, action); setActionTarget(null); }}
        />
      )}
      {detailTarget && <DetailModal report={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
