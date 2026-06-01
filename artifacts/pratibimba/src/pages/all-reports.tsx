import { useState, useMemo } from "react";
import { useApp, PRAKALPAS, AUDITORS, type Report } from "../context/app-context";

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
          <p className="font-data-mono text-[11px] text-primary mt-1">{report.iqrNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{report.prakalpa}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-surface-container-lowest rounded-lg p-4 space-y-2">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Audit Findings</p>
            <p className="font-body-md text-on-surface">{report.findings}</p>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Action Taken by Manager</label>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={4}
              placeholder="Describe the corrective action taken..."
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
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

interface EditReportModalProps {
  report: Report;
  onClose: () => void;
  onSave: (data: Partial<Report>) => void;
  canEditAll: boolean;
}

function EditReportModal({ report, onClose, onSave, canEditAll }: EditReportModalProps) {
  const [form, setForm] = useState({
    findings: report.findings,
    severity: report.severity,
    visitDate: report.visitDate,
    visitTime: report.visitTime,
    status: report.status,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Edit Report</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">{report.iqrNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{report.prakalpa} — {report.auditor}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Visit Date</label>
              <input type="date" value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Visit Time</label>
              <input type="time" value={form.visitTime} onChange={(e) => set("visitTime", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Severity</label>
            <div className="flex gap-3">
              {(["open_for_improvement", "non_conformance"] as const).map((s) => (
                <button key={s} type="button" onClick={() => set("severity", s)} className={`flex-1 py-2.5 rounded-lg font-label-md font-bold border-2 transition-all ${form.severity === s ? (s === "non_conformance" ? "bg-error/10 border-error text-error" : "bg-primary/10 border-primary text-primary") : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}>
                  {s === "open_for_improvement" ? "Open for Improvement" : "Non-Conformance"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Findings</label>
            <textarea value={form.findings} onChange={(e) => set("findings", e.target.value)} rows={4} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
          {canEditAll && (
            <div>
              <label className="font-label-md text-on-surface-variant block mb-2">Status</label>
              <div className="flex gap-3">
                {(["open", "closed"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => set("status", s)} className={`flex-1 py-2.5 rounded-lg font-label-md font-bold border-2 transition-all capitalize ${form.status === s ? (s === "closed" ? "bg-secondary/10 border-secondary text-secondary" : "bg-primary/10 border-primary text-primary") : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold">Save Changes</button>
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
              <div className="flex items-center gap-3 mb-1">
                <span className="font-data-mono text-[13px] text-primary font-black">{report.iqrNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{report.status}</span>
                {flagged && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/10 text-error">🚨 Red Flagged</span>}
              </div>
              <p className="font-label-md text-on-surface-variant">IQA Ref: <span className="text-on-surface font-bold">{report.iqaNumber}</span></p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Prakalpa", value: report.prakalpa },
              { label: "Auditor", value: report.auditor },
              { label: "Visit Date", value: new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
              { label: "Visit Time", value: report.visitTime },
              { label: "Report Date", value: new Date(report.createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
              { label: "Days Open", value: report.status === "open" ? `${days} days` : "Closed" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-1">Severity</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-label-md font-bold ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
              <span className="material-symbols-outlined text-[16px]">{report.severity === "non_conformance" ? "error_outline" : "info"}</span>
              {report.severity === "non_conformance" ? "Non-Conformance" : "Open for Improvement"}
            </span>
          </div>

          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-2">Audit Findings</p>
            <div className="bg-surface-container-lowest rounded-lg p-4 font-body-md text-on-surface leading-relaxed">{report.findings}</div>
          </div>

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

          {report.hasChecklist && (
            <div className="flex items-center gap-2 text-secondary font-label-md">
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              Audit report checklist uploaded
            </div>
          )}

          {report.actionTaken && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">Action Taken</p>
              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 font-body-md text-on-surface leading-relaxed">{report.actionTaken}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AllReportsPage() {
  const { reports, currentUser, getDaysOpen, isRedFlagged, updateReport, addActionTaken, closeReport } = useApp();
  const [actionTarget, setActionTarget] = useState<Report | null>(null);
  const [editTarget, setEditTarget] = useState<Report | null>(null);
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [search, setSearch] = useState("");

  const isChief = currentUser.role === "chief_auditor";
  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch = search === "" || r.iqrNumber.toLowerCase().includes(search.toLowerCase()) || r.iqaNumber.toLowerCase().includes(search.toLowerCase()) || r.prakalpa.toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || r.prakalpa === filterPrakalpa;
      const matchAuditor = filterAuditor === "All" || r.auditor === filterAuditor;
      const matchStatus = filterStatus === "All" || r.status === filterStatus.toLowerCase();
      const matchSeverity = filterSeverity === "All" || (filterSeverity === "Non-Conformance" ? r.severity === "non_conformance" : r.severity === "open_for_improvement");
      const matchUser = isManager ? r.prakalpa === currentUser.prakalpa : isAuditor ? r.auditor === currentUser.auditorName : true;
      return matchSearch && matchPrakalpa && matchAuditor && matchStatus && matchSeverity && matchUser;
    });
  }, [reports, search, filterPrakalpa, filterAuditor, filterStatus, filterSeverity, isManager, isAuditor, currentUser]);

  const canEdit = (r: Report) => isChief || (isAuditor && r.auditor === currentUser.auditorName);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">All Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} reports {isManager ? `for ${currentUser.prakalpa}` : ""}
          </p>
        </div>
      </div>

      {/* Red flag alert */}
      {reports.filter(isRedFlagged).length > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-error text-[24px]">flag</span>
          <div>
            <p className="font-label-md font-bold text-error">{reports.filter(isRedFlagged).length} Non-Conformance reports have been open for more than 30 days</p>
            <p className="font-label-md text-error/70">These require immediate attention.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search IQR/IQA number, Prakalpa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        {!isManager && (
          <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Prakalpa</option>
            {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
          </select>
        )}
        {!isAuditor && !isManager && (
          <select value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Auditors</option>
            {AUDITORS.map((a) => <option key={a}>{a}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Severity</option>
          <option value="Non-Conformance">Non-Conformance</option>
          <option value="Open for Improvement">Open for Improvement</option>
        </select>
        {(search || filterPrakalpa !== "All" || filterAuditor !== "All" || filterStatus !== "All" || filterSeverity !== "All") && (
          <button onClick={() => { setSearch(""); setFilterPrakalpa("All"); setFilterAuditor("All"); setFilterStatus("All"); setFilterSeverity("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear</button>
        )}
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
                  {["IQR Number", "IQA Ref", "Prakalpa", "Auditor", "Visit Date", "Severity", "Days Open", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, idx) => {
                  const days = getDaysOpen(report);
                  const flagged = isRedFlagged(report);
                  return (
                    <tr
                      key={report.id}
                      onClick={() => setDetailTarget(report)}
                      className={`transition-colors cursor-pointer ${flagged ? "bg-error/5 hover:bg-error/10" : idx % 2 === 1 ? "bg-surface-container-lowest/50 hover:bg-surface-container-low" : "hover:bg-surface-container-low"}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {flagged && <span className="material-symbols-outlined text-error text-[16px]">flag</span>}
                          <span className="font-data-mono text-[12px] text-primary font-bold">{report.iqrNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-data-mono text-[12px] text-on-surface-variant">{report.iqaNumber}</td>
                      <td className="px-4 py-4 font-body-md font-medium text-on-surface">{report.prakalpa}</td>
                      <td className="px-4 py-4 font-body-md text-on-surface">{report.auditor}</td>
                      <td className="px-4 py-4 font-data-mono text-[12px]">{new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                          {report.severity === "non_conformance" ? "Non-Conformance" : "Open for Improvement"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-data-mono font-bold text-[12px] ${flagged ? "text-error" : days > 15 ? "text-primary" : "text-on-surface-variant"}`}>
                          {report.status === "closed" ? "—" : `${days}d`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{report.status}</span>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isManager && report.status === "open" && report.severity === "open_for_improvement" && (
                            <button onClick={() => setActionTarget(report)} title="Add Action" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                              <span className="material-symbols-outlined text-[18px]">add_task</span>
                            </button>
                          )}
                          {canEdit(report) && (
                            <>
                              <button onClick={() => setEditTarget(report)} title="Edit" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              {report.status === "open" && (
                                <button onClick={() => closeReport(report.id)} title="Close" className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant">
            <span>Showing {filtered.length} of {reports.length} reports</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40" />Open: {reports.filter(r => r.status === "open").length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary/40" />Closed: {reports.filter(r => r.status === "closed").length}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error/60" />Flagged: {reports.filter(isRedFlagged).length}</span>
            </div>
          </div>
        </div>
      )}

      {actionTarget && (
        <ActionModal
          report={actionTarget}
          onClose={() => setActionTarget(null)}
          onSave={(action) => { addActionTaken(actionTarget.id, action); setActionTarget(null); }}
        />
      )}
      {editTarget && (
        <EditReportModal
          report={editTarget}
          canEditAll={isChief}
          onClose={() => setEditTarget(null)}
          onSave={(data) => { updateReport(editTarget.id, data); setEditTarget(null); }}
        />
      )}
      {detailTarget && <DetailModal report={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
