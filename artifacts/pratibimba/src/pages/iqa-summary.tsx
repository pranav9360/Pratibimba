import { useState, useMemo, useCallback, Fragment } from "react";
import { useApp, PRAKALPAS, AUDITORS, type ScheduledAudit, type Report } from "../context/app-context";

interface SummaryRow {
  audit: ScheduledAudit;
  reports: Report[];
}

interface FullDetailModalProps {
  row: SummaryRow;
  onClose: () => void;
}

function FullDetailModal({ row, onClose }: FullDetailModalProps) {
  const { getDaysOpen, isRedFlagged } = useApp();
  const { audit, reports } = row;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 bg-surface-container-lowest flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-data-mono text-[13px] text-primary font-black">{audit.iqaNumber}</span>
            </div>
            <h3 className="font-headline-sm text-on-surface">{audit.prakalpa}</h3>
            <p className="font-body-md text-on-surface-variant mt-0.5">{audit.purpose}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Final Auditor", value: audit.finalAuditor },
              { label: "Audit Period", value: `${new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` },
              { label: "Total Reports", value: `${reports.length}` },
              { label: "Open Reports", value: `${reports.filter(r => r.status === "open").length}` },
            ].map((item) => (
              <div key={item.label} className="bg-surface-container-lowest rounded-lg p-3">
                <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
                <p className="font-body-md font-bold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant/50 font-body-md">No reports for this audit</div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-headline-sm text-on-surface">Reports</h4>
              {reports.map((report) => {
                const days = getDaysOpen(report);
                const flagged = isRedFlagged(report);
                return (
                  <div key={report.id} className={`rounded-xl border p-5 space-y-4 ${flagged ? "border-error/30 bg-error/5" : "border-outline-variant/20"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-data-mono text-[12px] text-primary font-bold">{report.iqrNumber}</span>
                          {flagged && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error">🚨 Red Flagged</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 font-label-md text-on-surface-variant">
                          <span>Visit: {new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {report.visitTime}</span>
                          <span>·</span>
                          <span>Report Date: {new Date(report.createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                          {report.severity === "non_conformance" ? "Non-Conformance" : "Open for Improvement"}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${report.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{report.status}</span>
                        {report.status === "open" && <span className={`font-data-mono font-bold text-[11px] ${flagged ? "text-error" : "text-on-surface-variant"}`}>{days}d open</span>}
                      </div>
                    </div>
                    <div>
                      <p className="font-label-md text-on-surface-variant/70 mb-1">Findings</p>
                      <p className="font-body-md text-on-surface">{report.findings}</p>
                    </div>
                    {report.actionTaken && (
                      <div>
                        <p className="font-label-md text-on-surface-variant/70 mb-1">Action Taken</p>
                        <p className="font-body-md text-on-surface bg-secondary/5 rounded-lg p-3">{report.actionTaken}</p>
                      </div>
                    )}
                    {report.proofFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {report.proofFiles.map((f) => (
                          <span key={f} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container rounded-lg font-label-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">attach_file</span>{f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IQASummaryPage() {
  const { scheduledAudits, auditPlans, reports, getDaysOpen, isRedFlagged } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [doubleClickTarget, setDoubleClickTarget] = useState<SummaryRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const lastClickTime = useMemo(() => new Map<string, number>(), []);

  const summaryRows: SummaryRow[] = useMemo(() => {
    return scheduledAudits.map((audit) => ({
      audit,
      reports: reports.filter((r) => r.iqaNumber === audit.iqaNumber),
    }));
  }, [scheduledAudits, reports]);

  const filtered = useMemo(() => {
    return summaryRows.filter(({ audit, reports: r }) => {
      const matchSearch = search === "" || audit.iqaNumber.toLowerCase().includes(search.toLowerCase()) || audit.prakalpa.toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || audit.prakalpa === filterPrakalpa;
      const matchAuditor = filterAuditor === "All" || audit.finalAuditor === filterAuditor;
      const hasOpen = r.some((rp) => rp.status === "open");
      const hasClosed = r.every((rp) => rp.status === "closed");
      const status = r.length === 0 ? "no-reports" : hasClosed ? "closed" : "open";
      const matchStatus = filterStatus === "All" || filterStatus.toLowerCase() === status;
      return matchSearch && matchPrakalpa && matchAuditor && matchStatus;
    });
  }, [summaryRows, search, filterPrakalpa, filterAuditor, filterStatus]);

  const handleRowClick = useCallback((row: SummaryRow) => {
    const now = Date.now();
    const last = lastClickTime.get(row.audit.id) || 0;
    lastClickTime.set(row.audit.id, now);
    if (now - last < 400) {
      setDoubleClickTarget(row);
      setExpandedId(null);
    } else {
      setExpandedId((prev) => (prev === row.audit.id ? null : row.audit.id));
    }
  }, [lastClickTime]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.audit.id)));
  };

  const exportToCSV = (rows: SummaryRow[], summary = false) => {
    const lines: string[] = [];
    if (summary) {
      lines.push(["IQA Number", "Prakalpa", "Auditor", "Start Date", "End Date", "Total Reports", "Open Reports", "Non-Conformance", "Closed"].join(","));
      rows.forEach(({ audit, reports: r }) => {
        lines.push([
          audit.iqaNumber, audit.prakalpa, audit.finalAuditor,
          audit.startDate, audit.endDate,
          r.length,
          r.filter((x) => x.status === "open").length,
          r.filter((x) => x.severity === "non_conformance").length,
          r.filter((x) => x.status === "closed").length,
        ].map(String).join(","));
      });
    } else {
      lines.push(["IQA Number", "IQR Number", "Prakalpa", "Auditor", "Visit Date", "Visit Time", "Severity", "Findings", "Status", "Days Open", "Action Taken"].join(","));
      rows.forEach(({ audit, reports: r }) => {
        if (r.length === 0) {
          lines.push([audit.iqaNumber, "", audit.prakalpa, audit.finalAuditor, "", "", "", "", "", "", ""].join(","));
        } else {
          r.forEach((rp) => {
            lines.push([
              audit.iqaNumber, rp.iqrNumber, rp.prakalpa, rp.auditor,
              rp.visitDate, rp.visitTime,
              rp.severity === "non_conformance" ? "Non-Conformance" : "Open for Improvement",
              `"${rp.findings.replace(/"/g, '""')}"`,
              rp.status, rp.status === "open" ? getDaysOpen(rp) : 0,
              `"${(rp.actionTaken || "").replace(/"/g, '""')}"`,
            ].map(String).join(","));
          });
        }
      });
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IQA_${summary ? "Summary" : "Detail"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRows = selected.size > 0
    ? filtered.filter((r) => selected.has(r.audit.id))
    : filtered;

  const getAuditStatus = (reports: Report[]) => {
    if (reports.length === 0) return { label: "No Reports", style: "bg-surface-container text-on-surface-variant" };
    if (reports.every((r) => r.status === "closed")) return { label: "All Closed", style: "bg-secondary/10 text-secondary" };
    const hasNC = reports.some((r) => r.severity === "non_conformance" && r.status === "open");
    if (hasNC) return { label: "Non-Conformance Open", style: "bg-error/10 text-error" };
    return { label: "Open", style: "bg-primary/10 text-primary" };
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Summary</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {scheduledAudits.length} audits · {reports.length} reports · {auditPlans.length} pending plans
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToCSV(exportRows, true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">table_chart</span>
            {selected.size > 0 ? `Export Summary (${selected.size})` : "Export Summary"}
          </button>
          <button
            onClick={() => exportToCSV(exportRows, false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {selected.size > 0 ? `Export Detail (${selected.size})` : "Export All Detail"}
          </button>
        </div>
      </div>

      <p className="font-label-md text-on-surface-variant/60 italic">
        💡 Single click to expand details · Double-click for full report view · Checkbox to select for export
      </p>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search IQA number or Prakalpa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Prakalpa</option>
          {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Auditors</option>
          {AUDITORS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="No-Reports">No Reports</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                </th>
                {["IQA Number", "Prakalpa", "Auditor", "Period", "Reports", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center font-body-md text-on-surface-variant/50">No audits found</td></tr>
              ) : (
                filtered.map(({ audit, reports: auditReports }, idx) => {
                  const statusBadge = getAuditStatus(auditReports);
                  const isExpanded = expandedId === audit.id;
                  const isSelected = selected.has(audit.id);
                  const openCount = auditReports.filter((r) => r.status === "open").length;
                  const closedCount = auditReports.filter((r) => r.status === "closed").length;
                  const hasFlag = auditReports.some(isRedFlagged);

                  return (
                    <Fragment key={audit.id}>
                      <tr
                        onClick={() => handleRowClick({ audit, reports: auditReports })}
                        className={`transition-colors cursor-pointer select-none ${isSelected ? "bg-primary/5" : idx % 2 === 1 ? "bg-surface-container-lowest/50 hover:bg-surface-container-low" : "hover:bg-surface-container-low"} ${isExpanded ? "border-l-4 border-primary" : ""}`}
                      >
                        <td className="px-4 py-4" onClick={(e) => toggleSelect(audit.id, e)}>
                          <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {hasFlag && <span className="material-symbols-outlined text-error text-[14px]">flag</span>}
                            <span className="font-data-mono text-[12px] text-primary font-bold">{audit.iqaNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-body-md font-medium text-on-surface">{audit.prakalpa}</td>
                        <td className="px-4 py-4 font-body-md text-on-surface">{audit.finalAuditor}</td>
                        <td className="px-4 py-4 font-data-mono text-[12px] text-on-surface-variant whitespace-nowrap">
                          {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md font-bold text-on-surface">{auditReports.length}</span>
                            {auditReports.length > 0 && (
                              <div className="flex gap-1 font-label-md text-[10px]">
                                {openCount > 0 && <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">{openCount} open</span>}
                                {closedCount > 0 && <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded font-bold">{closedCount} closed</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadge.style}`}>{statusBadge.label}</span>
                        </td>
                        <td className="px-4 py-4 text-on-surface-variant/50">
                          <span className="material-symbols-outlined text-[18px] transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>expand_more</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${audit.id}-expand`} className="bg-surface-container-lowest">
                          <td colSpan={8} className="px-8 py-4 border-b border-outline-variant/20">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-6 font-body-md text-on-surface-variant">
                                <span className="flex gap-2"><strong className="text-on-surface">Purpose:</strong>{audit.purpose}</span>
                              </div>
                              {auditReports.length === 0 ? (
                                <p className="font-label-md text-on-surface-variant/50 italic">No reports filed for this audit yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {auditReports.map((rp) => {
                                    const days = getDaysOpen(rp);
                                    const flagged = isRedFlagged(rp);
                                    return (
                                      <div key={rp.id} className={`flex flex-wrap items-center gap-4 p-3 rounded-lg border ${flagged ? "border-error/30 bg-error/5" : "border-outline-variant/20 bg-white"}`}>
                                        <span className="font-data-mono text-[11px] font-bold text-primary">{rp.iqrNumber}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rp.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                                          {rp.severity === "non_conformance" ? "Non-Conformance" : "Open for Improvement"}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rp.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{rp.status}</span>
                                        {rp.status === "open" && <span className={`font-data-mono text-[11px] font-bold ${flagged ? "text-error" : ""}`}>{days}d open</span>}
                                        {flagged && <span className="text-error font-label-md font-bold">🚨</span>}
                                        <span className="font-label-md text-on-surface-variant/60 line-clamp-1 flex-1">{rp.findings}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setDoubleClickTarget({ audit, reports: auditReports }); }}
                                className="font-label-md text-primary hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">open_in_full</span>
                                View full summary
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant">
          <span>
            {selected.size > 0 ? `${selected.size} selected` : `${filtered.length} audits`}
          </span>
          <div className="flex gap-3">
            <span>{scheduledAudits.length} total · {reports.length} reports</span>
          </div>
        </div>
      </div>

      {doubleClickTarget && (
        <FullDetailModal row={doubleClickTarget} onClose={() => setDoubleClickTarget(null)} />
      )}
    </div>
  );
}
