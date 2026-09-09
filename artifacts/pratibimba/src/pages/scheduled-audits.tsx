import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useApp,
  DOMAINS,
  AUDIT_COORDINATORS,
  type ScheduledAudit,
} from "../context/app-context";
import {
  getScheduledAudits,
  updateScheduledAudit as updateScheduledAuditAPI,
  markMailSent,
} from "../services/scheduledAuditService";
// The backend treats the Audit Plan as the source of truth for the start
// date — `PUT /scheduled-audits/:id` explicitly rejects `startDate`, so a
// start-date edit has to go through the linked Audit Plan instead.
import { updateAuditPlan } from "../services/auditPlanService";

export default function ScheduledAuditsPage() {
  const { currentUser, auditors } = useApp();

  const [, navigate] = useLocation();
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [editTarget, setEditTarget] = useState<ScheduledAudit | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAuditors, setEditAuditors] = useState<string[]>([]);

  // Report modal state
  const [reportTarget, setReportTarget] = useState<ScheduledAudit | null>(null);

  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");

  useEffect(() => {
    loadScheduledAudits();
  }, []);

  const loadScheduledAudits = async () => {
    try {
      const data = await getScheduledAudits();
      setScheduledAudits(data);
    } catch (err) {
      console.error("Scheduled audits error:", err);
    }
  };

  const toggleAuditor = (auditor: string) => {
    setEditAuditors((prev) =>
      prev.includes(auditor)
        ? prev.filter((a) => a !== auditor)
        : [...prev, auditor]
    );
  };

  const isLead = currentUser.role === "lead_auditor";
  const isAuditor = currentUser.role === "auditor";

  const allLocations = useMemo(
    () => Array.from(new Set(scheduledAudits.map((s) => s.location).filter(Boolean))),
    [scheduledAudits]
  );

  const uniqueCoordinators = useMemo(
    () => Array.from(new Set(AUDIT_COORDINATORS.filter(Boolean))),
    []
  );

  const uniqueAuditors = useMemo(
    () => Array.from(new Set(auditors.filter(Boolean))),
    [auditors]
  );

  const getStatus = (s: ScheduledAudit) => {
    const now = new Date();
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    if (now < start) return "Upcoming";
    if (now >= start && now <= end) return "Ongoing";
    return "Completed";
  };

  const filtered = useMemo(
    () =>
      scheduledAudits.filter((s) => {
        const status = getStatus(s);
        const matchSearch =
          !search ||
          s.iqaNumber.toLowerCase().includes(search.toLowerCase()) ||
          s.domain.toLowerCase().includes(search.toLowerCase()) ||
          s.location.toLowerCase().includes(search.toLowerCase()) ||
          (s.sublocation || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.auditCoordinator || "").toLowerCase().includes(search.toLowerCase());
        const matchDomain = filterDomain === "All" || s.domain === filterDomain;
        const matchLocation = filterLocation === "All" || s.location === filterLocation;
        const matchAuditor =
          filterAuditor === "All" ||
          (s.auditors && s.auditors.includes(filterAuditor)) ||
          s.finalAuditor === filterAuditor;
        const matchStatus = filterStatus === "All" || status === filterStatus;
        const matchCoord = filterCoordinator === "All" || s.auditCoordinator === filterCoordinator;
        return (
          matchSearch &&
          matchDomain &&
          matchLocation &&
          matchAuditor &&
          matchStatus &&
          matchCoord
        );
      }),
    [scheduledAudits, search, filterDomain, filterLocation, filterAuditor, filterStatus, filterCoordinator]
  );

  const statusBadge = (s: ScheduledAudit) => {
    const st = getStatus(s);
    if (st === "Ongoing")
      return { label: "Ongoing", cls: "bg-primary/10 text-primary border-primary/30" };
    if (st === "Upcoming")
      return { label: "Upcoming", cls: "bg-secondary/10 text-secondary border-secondary/30" };
    return { label: "Completed", cls: "bg-surface-container-high text-on-surface-variant border-outline-variant/30" };
  };

  const handleEditOpen = (s: ScheduledAudit) => {
    setEditTarget(s);
    setEditStartDate(s.startDate ? s.startDate.split("T")[0] : "");
    setEditEndDate(s.endDate ? s.endDate.split("T")[0] : "");
    setEditAuditors(s.auditors || []);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;

    // Resolve the scheduled audit's own id defensively (Mongo's `_id`,
    // normalized to `.id` by the service layer) so `undefined` never
    // reaches the request URL.
    const id = editTarget.id || editTarget._id;
    if (!id) {
      console.error("Failed to update audit: missing id on edit target", editTarget);
      return;
    }

    const originalStartDate = editTarget.startDate
      ? editTarget.startDate.split("T")[0]
      : "";
    const startDateChanged = editStartDate && editStartDate !== originalStartDate;

    try {
      // Start date lives on the Audit Plan, not the Scheduled Audit record
      // — the backend silently drops `startDate` sent to
      // `/scheduled-audits/:id`. Update the linked plan first so the
      // backend's own sync logic (and any end-date auto-adjustment) runs
      // before we set the end date explicitly below.
      if (startDateChanged) {
        const planId = editTarget.auditPlan;
        if (!planId) {
          console.error(
            "Cannot update start date: this scheduled audit has no linked auditPlan id",
            editTarget
          );
        } else {
          await updateAuditPlan(planId, { auditPlannedDate: editStartDate });
        }
      }

      // End date and auditor assignments update the Scheduled Audit record
      // directly.
      await updateScheduledAuditAPI(id, {
        endDate: editEndDate,
        auditors: editAuditors,
      });

      setEditTarget(null);
      loadScheduledAudits();
    } catch (err) {
      console.error("Failed to update audit:", err);
    }
  };

  const handleSendMail = async (id: string) => {
    try {
      await markMailSent(id);
      loadScheduledAudits();
    } catch (err) {
      console.error("Failed to mark mail sent:", err);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Scheduled Audits</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            View, filter, and manage scheduled internal quality audits.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/10 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search IQA #, domain, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-outline-variant/30 rounded-lg focus:outline-none focus:border-primary bg-surface-container-lowest"
          />
        </div>

        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
          className="px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white font-medium text-on-surface"
        >
          <option value="All">All Domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white font-medium text-on-surface"
        >
          <option value="All">All Locations</option>
          {allLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <select
          value={filterCoordinator}
          onChange={(e) => setFilterCoordinator(e.target.value)}
          className="px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white font-medium text-on-surface"
        >
          <option value="All">All Coordinators</option>
          {uniqueCoordinators.map((coord) => (
            <option key={`coord-${coord}`} value={coord}>{coord}</option>
          ))}
        </select>

        {!isAuditor && (
          <select
            value={filterAuditor}
            onChange={(e) => setFilterAuditor(e.target.value)}
            className="px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white font-medium text-on-surface"
          >
            <option value="All">All Auditors</option>
            {uniqueAuditors.map((aud) => (
              <option key={`aud-${aud}`} value={aud}>{aud}</option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white font-medium text-on-surface"
        >
          <option value="All">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Audits Table */}
      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low border-b border-outline-variant/15 text-on-surface-variant font-label-md uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">IQA #</th>
                <th className="px-4 py-3">Domain / Location</th>
                <th className="px-4 py-3">Audit Dates</th>
                <th className="px-4 py-3">Coordinator</th>
                <th className="px-4 py-3">Auditors</th>
                <th className="px-4 py-3">Status</th>
                {isLead && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant/50">
                    No scheduled audits match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((audit, idx) => {
                  const badge = statusBadge(audit);
                  return (
                    <tr key={(audit.id || audit._id) || `audit-${idx}`} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="px-4 py-3 font-data-mono font-bold text-primary">
                        {audit.iqaNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-on-surface">{audit.domain}</p>
                        <p className="text-on-surface-variant/70 text-[11px]">{audit.location} {audit.sublocation ? `(${audit.sublocation})` : ""}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-on-surface">{audit.startDate ? new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</p>
                        <p className="text-[10px] text-on-surface-variant/60">to {audit.endDate ? new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-on-surface font-medium">
                        {audit.auditCoordinator || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {(audit.auditors || []).length > 0 ? audit.auditors.join(", ") : audit.finalAuditor || "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      {isLead && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleEditOpen(audit)}
                            className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface font-medium text-[11px]"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/20 space-y-4">
            <h3 className="font-headline-sm font-bold text-on-surface">Edit Scheduled Audit ({editTarget.iqaNumber})</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Start Date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">End Date</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-black/5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:brightness-110"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
