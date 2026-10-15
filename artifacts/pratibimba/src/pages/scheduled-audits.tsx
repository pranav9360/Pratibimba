import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { FilterDate } from "../components/filters/filter-date";
import { matchesDateFilter, type DateFilter } from "../components/filters/date-filter-utils";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";

import {
  useApp,
  PRAKALPAS,
  AUDIT_COORDINATORS,
  type ScheduledAudit,
} from "../context/app-context";

import {
  getScheduledAudits,
  updateScheduledAudit as updateScheduledAuditAPI,
  markScheduledAuditCompleted,
} from "../services/scheduledAuditService";

import {
  updateAuditPlan,
  unscheduleAuditPlan,
} from "../services/auditPlanService";

import {
  getScheduledAuditFindings,
  getCoordinatorFindingSummaries,
  type CoordinatorFindingSummary,
  createAuditFindingDraft,
  updateAuditFindingDraft,
  getAuditorBatchStatus,
  submitAllAuditorFindings,
  type AuditFinding,
} from "../services/auditFindingService";

import FindingEvidence from "../components/finding-evidence";
import SendScheduledAuditEmailModal from "../components/send-scheduled-audit-email-modal";

export default function ScheduledAuditsPage() {

const { currentUser, auditors, auditorDirectoryError } = useApp();

  const [, navigate] = useLocation();

  const [scheduledAudits, setScheduledAudits] =
    useState<ScheduledAudit[]>([]);
  const [receivedFindings, setReceivedFindings] = useState<Record<string, CoordinatorFindingSummary>>({});

  const [editTarget, setEditTarget] =
    useState<ScheduledAudit | null>(null);

  const [unscheduleTarget, setUnscheduleTarget] =
    useState<ScheduledAudit | null>(null);
  const [isUnscheduling, setIsUnscheduling] = useState(false);
  const [unscheduleError, setUnscheduleError] = useState("");

  const [mailTarget, setMailTarget] =
    useState<ScheduledAudit | null>(null);

  const [editStartDate, setEditStartDate] =
    useState("");

  const [editEndDate, setEditEndDate] =
    useState("");

  const [editCoordinator, setEditCoordinator] =
    useState("");


const [editAuditors, setEditAuditors] =
    useState<string[]>([]);

  const [editLeadAuditor, setEditLeadAuditor] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [reportTarget, setReportTarget] =
    useState<ScheduledAudit | null>(null);

  const [completionTarget, setCompletionTarget] =
    useState<ScheduledAudit | null>(null);

  const [completionConfirmed, setCompletionConfirmed] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  const [completionError, setCompletionError] =
    useState("");

  const [reportConfirmed, setReportConfirmed] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [filterPrakalpa, setFilterPrakalpa] =
    useState("All");

  const [filterLocation, setFilterLocation] =
    useState("All");

  const [filterAuditor, setFilterAuditor] =
    useState("All");

  const [filterSublocation, setFilterSublocation] = useState("All");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("All");
  const [filterDate, setFilterDate] = useState<DateFilter>({ mode: "all", start: "", end: "" });
  const [filterStatus, setFilterStatus] =
    useState("All");

  const [filterCoordinator, setFilterCoordinator] =
    useState("All");

  const [findingDialogTarget, setFindingDialogTarget] =
    useState<ScheduledAudit | null>(null);
  const [findingDrafts, setFindingDrafts] =
    useState<AuditFinding[]>([]);
  const [selectedFindingId, setSelectedFindingId] =
    useState<string | null>(null);
  const [findingDescription, setFindingDescription] =
    useState("");
  const [findingClassification, setFindingClassification] =
    useState<"NC" | "OFI" | "">("");
  const [findingLoading, setFindingLoading] =
    useState(false);
  const [findingSaving, setFindingSaving] =
    useState(false);
  const [findingSubmitting, setFindingSubmitting] = useState(false);
  const [auditorBatchSubmitted, setAuditorBatchSubmitted] = useState(false);
  const [auditorSubmissionByAudit, setAuditorSubmissionByAudit] =
    useState<Record<string, boolean>>({});
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [batchAcknowledged, setBatchAcknowledged] = useState(false);
  const [findingMessage, setFindingMessage] =
    useState("");
  const [findingError, setFindingError] =
    useState("");

  useEffect(() => {
    loadScheduledAudits();
  }, []);

  const loadScheduledAudits = async () => {
    try {
      const data = await getScheduledAudits();

      setScheduledAudits(
        Array.isArray(data) ? data : []
      );
      if (currentUser.role === "auditor") {
        const assigned = (Array.isArray(data) ? data : []).filter(
          (audit) => (audit.auditors || []).includes(currentUser.name || "") || audit.leadAuditor === currentUser.name
        );
        const statuses = await Promise.all(
          assigned.map(async (audit) => {
            const id = audit.id || audit._id;
            if (!id) return null;
            try {
              const status = await getAuditorBatchStatus(id);
              return [id, Boolean(status)] as const;
            } catch (error) {
              console.error("Unable to load Auditor submission status", id, error);
              return [id, true] as const;
            }
          })
        );
        setAuditorSubmissionByAudit(
          Object.fromEntries(statuses.filter((entry) => entry !== null) as Array<readonly [string, boolean]>)
        );
      }
      if (currentUser.role === "audit_coordinator") {
        try {
          const summaries = await getCoordinatorFindingSummaries();
          setReceivedFindings(Object.fromEntries(summaries.map(s => [s.scheduledAuditId, s])));
        } catch (summaryError) {
          console.error("Unable to load Coordinator finding counts", summaryError);
          setReceivedFindings({});
        }
      }
    } catch (err) {
      console.error(
        "Scheduled audits error:",
        err
      );
    }
  };

  const toggleAuditor = (
    auditor: string
  ) => {
    setEditAuditors((prev) =>
      prev.includes(auditor)
        ? prev.filter(
            (a) => a !== auditor
          )
        : [...prev, auditor]
    );
  };

  const canManage =
    currentUser.role === "audit_coordinator" ||
    currentUser.role === "admin" ||
    currentUser.role === "super_admin";

  const isAuditor =
    currentUser.role === "auditor";

  const showActionsColumn =
    canManage || isAuditor;

  const showMailColumn = currentUser.role !== "auditor";

  const getStatus = (
    s: ScheduledAudit
  ): "completed" | "ongoing" | "upcoming" => {
    if (s.status === "completed") {
      return "completed";
    }

    const startDate = new Date(s.startDate);

    if (Number.isNaN(startDate.getTime())) {
      return "upcoming";
    }

    const today = new Date();

    // Once an audit starts, it remains In Progress
    // until explicitly marked Completed.
    return today >= startDate ? "ongoing" : "upcoming";
  };

  const canMarkCompleted = (
    s: ScheduledAudit
  ) => {
    if (
      s.status === "completed"
    ) {
      return false;
    }

    const endDate =
      new Date(s.endDate);

    if (
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return false;
    }

    return new Date() >= endDate;
  };

  const canAddFindingsForAudit = (
    audit: ScheduledAudit
  ) => {
    if (
      currentUser.role !== "auditor"
    ) {
      return false;
    }

    if (
      !(audit.auditors || []).includes(
        currentUser.name || ""
      ) && audit.leadAuditor !== currentUser.name
    ) {
      return false;
    }

    if (audit.status === "completed") {
      return false;
    }

    const auditId = audit.id || audit._id;
    if (!auditId || auditorSubmissionByAudit[auditId] !== false) {
      return false;
    }

    const startDate =
      new Date(audit.startDate);

    if (
      Number.isNaN(
        startDate.getTime()
      )
    ) {
      return false;
    }

    return new Date() >= startDate;
  };

  const loadFindingDialogData = async (
    audit: ScheduledAudit
  ) => {
    const id =
      audit.id || audit._id;

    if (!id) {
      setFindingError(
        "Scheduled Audit ID is missing."
      );
      return;
    }

    setFindingLoading(true);
    setFindingError("");
    setFindingMessage("");

    try {
      const [findings, batchStatus] = await Promise.all([
        getScheduledAuditFindings(id), getAuditorBatchStatus(id),
      ]);
      setAuditorBatchSubmitted(Boolean(batchStatus));
      setAuditorSubmissionByAudit((previous) => ({
        ...previous,
        [id]: Boolean(batchStatus),
      }));

      setFindingDrafts(
        Array.isArray(findings)
          ? findings
          : []
      );

      const firstDraft =
        (Array.isArray(findings)
          ? findings
          : []
        ).find(
          (item) =>
            String(item.status).toUpperCase() === "DRAFT" ||
            item.workflowStatus === "auditor_draft"
        );

      if (firstDraft) {
        setSelectedFindingId(
          firstDraft._id || firstDraft.id || ""
        );
        setFindingDescription(
          firstDraft.description ||
            firstDraft.findings ||
            ""
        );
        setFindingClassification(
          firstDraft.classification === "NC" ||
            firstDraft.classification === "OFI"
            ? firstDraft.classification
            : ""
        );
      } else {
        setSelectedFindingId(null);
        setFindingDescription("");
        setFindingClassification("");
      }
    } catch (err: any) {
      setAuditorBatchSubmitted(true);
      setFindingError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load findings for this audit."
      );
    } finally {
      setFindingLoading(false);
    }
  };

  const openFindingDialog = async (
    audit: ScheduledAudit
  ) => {
    setFindingLoading(true);
    setAuditorBatchSubmitted(true);
    setFindingDialogTarget(audit);
    setFindingError("");
    setFindingMessage("");
    setSelectedFindingId(null);
    setFindingDescription("");
    setFindingClassification("");
    await loadFindingDialogData(audit);
  };

  const closeFindingDialog = () => {
    setShowBatchConfirm(false);
    setBatchAcknowledged(false);
    setFindingDialogTarget(null);
    setFindingDrafts([]);
    setSelectedFindingId(null);
    setFindingDescription("");
    setFindingClassification("");
    setFindingError("");
    setFindingMessage("");
  };

  const fillFindingForm = (
    finding: AuditFinding
  ) => {
    setSelectedFindingId(
      finding._id || finding.id || null
    );
    setFindingDescription(
      finding.description ||
        finding.findings ||
        ""
    );
    setFindingClassification(
      finding.classification === "NC" ||
        finding.classification === "OFI"
        ? finding.classification
        : ""
    );
    setFindingError("");
    setFindingMessage("");
  };

  const handleSaveFindingDraft = async () => {
    if (!findingDialogTarget) {
      return;
    }

    if (!findingDescription.trim()) {
      setFindingError(
        "Finding description is required."
      );
      return;
    }

    const id =
      findingDialogTarget.id ||
      findingDialogTarget._id;

    if (!id) {
      setFindingError(
        "Scheduled Audit ID is missing."
      );
      return;
    }

    try {
      setFindingSaving(true);
      setFindingError("");
      setFindingMessage("");

      if (selectedFindingId) {
        await updateAuditFindingDraft(
          id,
          selectedFindingId,
          {
            description: findingDescription.trim(),
            classification:
              findingClassification || undefined,
          }
        );

        setFindingMessage(
          "Draft saved successfully."
        );
      } else {
        const created =
          await createAuditFindingDraft(id, {
            description:
              findingDescription.trim(),
            classification:
              findingClassification || undefined,
          });

        setSelectedFindingId(
          created._id || created.id || null
        );
        setFindingMessage(
          "Draft created. Add your proof below, then submit to the Lead Auditor."
        );
      }

      await loadFindingDialogData(
        findingDialogTarget
      );
    } catch (err: any) {
      setFindingError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save the draft."
      );
    } finally {
      setFindingSaving(false);
    }
  };

  const handleSubmitFindingBatch = async () => {
    const id = findingDialogTarget?.id || findingDialogTarget?._id;
    if (!id || !batchAcknowledged) return;
    try {
      setFindingSubmitting(true);
      setFindingError("");
      const result = await submitAllAuditorFindings(id);
      setAuditorBatchSubmitted(true);
      setAuditorSubmissionByAudit((previous) => ({
        ...previous,
        [id]: true,
      }));
      setShowBatchConfirm(false);
      setBatchAcknowledged(false);
      await loadFindingDialogData(findingDialogTarget!);
      setFindingMessage(`Final batch sent to Lead Auditor (${result.findingCount} findings). No further edits or submissions are allowed.`);
    } catch (err: any) {
      setFindingError(err?.response?.data?.message || err?.message || "Unable to send the complete batch.");
      setShowBatchConfirm(false);
    } finally { setFindingSubmitting(false); }
  };

  const openCompletionReview = (
    audit: ScheduledAudit
  ) => {
    setCompletionTarget(audit);
    setCompletionConfirmed(false);
    setCompletionError("");
  };

  const confirmCompletion =
    async () => {
      if (!completionTarget) {
        return;
      }

      const id =
        completionTarget.id ||
        completionTarget._id;

      if (!id) {
        setCompletionError(
          "Scheduled Audit ID is missing."
        );
        return;
      }

      if (!completionConfirmed) {
        setCompletionError(
          "Please confirm that you have verified all audit details."
        );
        return;
      }

      try {
        setCompleting(true);
        setCompletionError("");

        await markScheduledAuditCompleted(
          id
        );

        await loadScheduledAudits();

        setCompletionTarget(null);
        setCompletionConfirmed(false);
      } catch (err: any) {
        console.error(
          "Failed to complete scheduled audit:",
          err
        );

        setCompletionError(
          err?.response?.data?.message ||
            "Failed to mark the audit as completed."
        );
      } finally {
        setCompleting(false);
      }
    };

  const allLocations = useMemo(
    () => [
      ...new Set(
        scheduledAudits
          .map((s) => s.location)
          .filter(Boolean)
      ),
    ],
    [scheduledAudits]
  );

  const filterAudits = useMemo(() => scheduledAudits.filter(s =>
    (currentUser.role !== "audit_coordinator" || s.auditCoordinator === currentUser.name) &&
    (!isAuditor || (s.auditors || []).includes(currentUser.name || ""))
  ), [scheduledAudits, currentUser, isAuditor]);
  const filterPrakalpaOptions = useMemo(() => [...new Set(filterAudits.map(s => s.prakalpa).filter(Boolean))], [filterAudits]);
  const filterCoordinatorOptions = useMemo(() => [...new Set(filterAudits.map(s => s.auditCoordinator).filter(Boolean))], [filterAudits]);

  const filtered = useMemo(
    () =>
      scheduledAudits.filter((s) => {
        const status =
          getStatus(s);

        const q =
          search
            .trim()
            .toLowerCase();

        const matchSearch =
          !q ||
          s.iqaNumber
            ?.toLowerCase()
            .includes(q) ||
          s.prakalpa
            ?.toLowerCase()
            .includes(q) ||
          s.location
            ?.toLowerCase()
            .includes(q) ||
          (s.sublocation || "")
            .toLowerCase()
            .includes(q) ||
          (s.auditCoordinator || "")
            .toLowerCase()
            .includes(q) ||
          (s.prakalphaPramukh || "")
            .toLowerCase()
            .includes(q);

        const matchUser =
          (currentUser.role !== "audit_coordinator" ||
            s.auditCoordinator === currentUser.name) &&
          (!isAuditor ||
            (s.auditors || []).includes(
              currentUser.name || ""
            ));

        return (
          matchSearch &&
          (filterPrakalpa === "All" ||
            s.prakalpa ===
              filterPrakalpa) &&
          (filterLocation === "All" ||
            s.location ===
              filterLocation) &&
          (filterAuditor === "All" ||
            (s.auditors || []).includes(
              filterAuditor
            )) &&
          (filterStatus === "All" ||
            status ===
              filterStatus.toLowerCase()) &&
          (filterCoordinator === "All" ||
            s.auditCoordinator ===
              filterCoordinator) &&
          (filterSublocation === "All" || s.sublocation === filterSublocation) &&
          (filterAuditArea === "All" || (s.auditAreas || []).includes(filterAuditArea)) &&
          (filterPramukh === "All" || s.prakalphaPramukh === filterPramukh) &&
          matchesDateFilter(s.startDate, s.endDate, filterDate) &&
          matchUser
        );
      }),
    [
      scheduledAudits,
      search,
      filterPrakalpa,
      filterLocation,
      filterAuditor,
      filterStatus,
      filterCoordinator,
      filterSublocation,
      filterAuditArea,
      filterPramukh,
      filterDate,
      isAuditor,
      currentUser,
    ]
  );

  const statusBadge = (
    s: ScheduledAudit
  ) => {
    const status =
      getStatus(s);

    if (status === "ongoing") {
      return {
        label: "Ongoing",
        cls: "bg-primary/10 text-primary",
      };
    }

    if (status === "upcoming") {
      return {
        label: "Upcoming",
        cls: "bg-secondary/10 text-secondary",
      };
    }

    return {
      label: "Completed",
      cls: "bg-surface-container text-on-surface-variant",
    };
  };

  const handleUnschedule = async () => {
    if (!unscheduleTarget || isUnscheduling) return;

    const planId = unscheduleTarget.auditPlan;
    if (!planId) {
      setUnscheduleError("Linked Audit Plan ID is missing.");
      return;
    }

    const allowed =
      currentUser.role === "admin" ||
      currentUser.role === "super_admin" ||
      (currentUser.role === "audit_coordinator" &&
        unscheduleTarget.auditCoordinator === currentUser.name);

    if (!allowed || unscheduleTarget.status === "completed") {
      setUnscheduleError("You cannot unschedule this audit.");
      return;
    }

    try {
      setIsUnscheduling(true);
      setUnscheduleError("");
      await unscheduleAuditPlan(planId);
      await loadScheduledAudits();
      setUnscheduleTarget(null);
    } catch (err: any) {
      setUnscheduleError(err?.message || "Failed to unschedule audit.");
    } finally {
      setIsUnscheduling(false);
    }
  };

  const openEdit = (
    audit: ScheduledAudit
  ) => {
    setEditError("");

    setEditTarget(audit);

    setEditStartDate(
      audit.startDate
        ? new Date(audit.startDate)
            .toISOString()
            .split("T")[0]
        : ""
    );

    setEditEndDate(
      audit.endDate
        ? new Date(audit.endDate)
            .toISOString()
            .split("T")[0]
        : ""
    );

    setEditCoordinator(
      audit.auditCoordinator || ""
    );


setEditAuditors(
      audit.auditors || []
    );

    setEditLeadAuditor(
      audit.leadAuditor || ""
    );
  };

  const closeEdit = () => {
    if (saving) return;

    setEditTarget(null);
    setEditStartDate("");
    setEditEndDate("");
    setEditCoordinator("");

setEditAuditors([]);
    setEditLeadAuditor("");
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }

    setEditError("");

    if (
      !editStartDate ||
      !editEndDate
    ) {
      setEditError(
        "Start Date and End Date are required."
      );
      return;
    }

    if (
      new Date(editEndDate) <
      new Date(editStartDate)
    ) {
      setEditError(
        "End Date cannot be before Start Date."
      );
      return;
    }

    if (
      !editCoordinator.trim()
    ) {
      setEditError(
        "Audit Coordinator is required."
      );
      return;
    }


    if (!editLeadAuditor.trim()) {
      setEditError(
        "Lead Auditor is required."
      );
      return;
    }

    const scheduledAuditId =
      editTarget.id ||
      editTarget._id;

    if (!scheduledAuditId) {
      setEditError(
        "Scheduled Audit ID is missing."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * Scheduled Audit editing uses ONE backend request.
       *
       * The backend scheduledAuditService synchronizes:
       *
       * AuditPlan:
       * - auditPlannedDate
       * - auditCoordinator
       * - auditors
       *
       * ScheduledAudit:
       * - startDate
       * - endDate
       * - auditCoordinator
       * - auditors
       */
      await updateScheduledAuditAPI(
        scheduledAuditId,
        {
          startDate:
            editStartDate,

          endDate:
            editEndDate,

          auditCoordinator:
            editCoordinator,


          auditors:
            editAuditors,

          leadAuditor:
            editLeadAuditor,
        }
      );

      await loadScheduledAudits();

      closeEdit();
    } catch (err: any) {
      console.error(
        "Error updating scheduled audit:",
        err
      );

      setEditError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update scheduled audit."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">

      <div className="flex flex-wrap justify-between items-start gap-4">

        <div>
          <h2 className="font-headline-md text-on-surface">
            Scheduled Audits
          </h2>

          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} audits
          </p>
        </div>

      </div>

      {/* Filters */}

      <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search Audit ID, Prakalpa, Location..." }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterPrakalpa !== "All" ? [{ key: "filterPrakalpa", label: "Prakalpa", value: filterPrakalpa, onRemove: () => setFilterPrakalpa("All") }] : []),
            ...(filterLocation !== "All" ? [{ key: "filterLocation", label: "Location", value: filterLocation, onRemove: () => setFilterLocation("All") }] : []),
            ...(!isAuditor && filterAuditor !== "All" ? [{ key: "filterAuditor", label: "Auditor", value: filterAuditor, onRemove: () => setFilterAuditor("All") }] : []),
            ...(filterStatus !== "All" ? [{ key: "filterStatus", label: "Status", value: filterStatus, onRemove: () => setFilterStatus("All") }] : []),
            ...(filterCoordinator !== "All" ? [{ key: "filterCoordinator", label: "Coordinator", value: filterCoordinator, onRemove: () => setFilterCoordinator("All") }] : []),
            ...(filterSublocation !== "All" ? [{ key: "sublocation", label: "Sublocation", value: filterSublocation, onRemove: () => setFilterSublocation("All") }] : []),
            ...(filterAuditArea !== "All" ? [{ key: "auditArea", label: "Audit Area", value: filterAuditArea, onRemove: () => setFilterAuditArea("All") }] : []),
            ...(filterPramukh !== "All" ? [{ key: "pramukh", label: "Pramukh", value: filterPramukh, onRemove: () => setFilterPramukh("All") }] : []),
            ...(filterDate.mode !== "all" && filterDate.start ? [{ key: "date", label: "Scheduled Date", value: filterDate.mode === "range" ? `${filterDate.start} to ${filterDate.end || "…"}` : `${filterDate.mode}: ${filterDate.start}`, onRemove: () => setFilterDate({ mode: "all", start: "", end: "" }) }] : [])
          ]}
          onClearAll={() => { setSearch(""); setFilterPrakalpa("All"); setFilterLocation("All"); setFilterAuditor("All"); setFilterStatus("All"); setFilterCoordinator("All"); setFilterSublocation("All"); setFilterAuditArea("All"); setFilterPramukh("All"); setFilterDate({ mode: "all", start: "", end: "" }); }} resultCount={filtered.length} resultLabel="audits shown">
          <FilterSelect label="Prakalpa" value={filterPrakalpa} onChange={setFilterPrakalpa} options={filterPrakalpaOptions.map(value => ({ value, label: value }))} searchable allLabel="All Prakalpas" />
          <FilterSelect label="Location" value={filterLocation} onChange={setFilterLocation} options={[...new Set(filterAudits.map(s => s.location).filter((value): value is string => typeof value === "string" && value.length > 0))].map(value => ({ value, label: value }))} searchable allLabel="All Locations" />
          {!isAuditor && <FilterSelect label="Auditor" value={filterAuditor} onChange={setFilterAuditor} options={auditors.map(value => ({ value, label: value }))} searchable allLabel="All Auditors" />}
          <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={[{ value: "Upcoming", label: "Upcoming" }, { value: "Ongoing", label: "Ongoing" }, { value: "Completed", label: "Completed" }]} allLabel="All Statuses" />
          <FilterSelect label="Coordinator" value={filterCoordinator} onChange={setFilterCoordinator} options={filterCoordinatorOptions.map(value => ({ value, label: value }))} searchable allLabel="All Coordinators" />
          <FilterSelect label="Sublocation" value={filterSublocation} onChange={setFilterSublocation} options={[...new Set(filterAudits.map(s => s.sublocation).filter((value): value is string => typeof value === "string" && value.length > 0))].map(value => ({ value, label: value }))} searchable />
          <FilterSelect label="Audit Area" value={filterAuditArea} onChange={setFilterAuditArea} options={[...new Set(filterAudits.flatMap(s => s.auditAreas || []))].map(value => ({ value, label: value }))} searchable />
          <FilterSelect label="Pramukh" value={filterPramukh} onChange={setFilterPramukh} options={[...new Set(filterAudits.map(s => s.prakalphaPramukh).filter((value): value is string => typeof value === "string" && value.length > 0))].map(value => ({ value, label: value }))} searchable />
          <FilterDate label="Scheduled Date" value={filterDate} onChange={setFilterDate} />
        </FilterToolbar>

      {/* Table */}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">

          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">
            pending_actions
          </span>

          <p className="font-headline-sm text-on-surface-variant/40">
            No scheduled audits
          </p>

        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1180px] text-left">

              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">

                <tr>

                  {[
                    "Audit ID",
                    "Prakalpa",
                    "Location",
                    "Sublocation",
                    "Audit Areas",
                    "Auditors",
                    "Dates",
                    "Coordinator",
                    "Pramukh",
                    ...(showMailColumn ? ["Mail"] : []),
                    "Status",
                    ...(showActionsColumn
                      ? ["Actions"]
                      : []),
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]"
                    >
                      {heading}
                    </th>
                  ))}

                </tr>

              </thead>

              <tbody className="divide-y divide-outline-variant/10">

                {filtered.map(
                  (audit, idx) => {
                    const badge =
                      statusBadge(
                        audit
                      );

                    const now =
                      new Date();

                    const start =
                      new Date(
                        audit.startDate
                      );

                    const end =
                      new Date(
                        audit.endDate
                      );

                    const duration =
                      end.getTime() -
                      start.getTime();

                    const pct =
                      duration <= 0
                        ? now >= start
                          ? 100
                          : 0
                        : Math.min(
                            100,
                            Math.max(
                              0,
                              ((now.getTime() -
                                start.getTime()) /
                                duration) *
                                100
                            )
                          );

                    const isMyLeadAssignment =
                      currentUser.role === "auditor" &&
                      audit.leadAuditor === currentUser.name;

                    const isMyTeamAssignment =
                      currentUser.role === "auditor" &&
                      !isMyLeadAssignment &&
                      (audit.auditors || []).includes(currentUser.name);

                    return (
                      <tr
                        key={
                          audit.id ||
                          audit._id ||
                          `audit-${idx}`
                        }
                        className={`hover:bg-surface-container-low transition-colors ${
                          idx % 2 === 1
                            ? "bg-surface-container-lowest/50"
                            : ""
                        }`}
                      >

                        {/* Audit ID */}

                        <td className="px-3 py-3">

                          <p className="font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">
                            {audit.iqaNumber}
                          </p>
                          {isMyLeadAssignment && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold whitespace-nowrap">
                              Lead Auditor
                            </span>
                          )}
                          {isMyTeamAssignment && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold whitespace-nowrap">
                              Team Auditor
                            </span>
                          )}

                          <div className="h-1 bg-surface-container-high rounded-full mt-1.5 w-20">

                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${pct}%`,
                              }}
                            />

                          </div>

                        </td>

                        {/* Prakalpa */}

                        <td className="px-3 py-3">

                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold whitespace-nowrap">
                            {audit.prakalpa}
                          </span>

                        </td>

                        {/* Location */}

                        <td className="px-3 py-3 font-body-md font-medium text-on-surface whitespace-nowrap">
                          {audit.location}
                        </td>

                        {/* Sublocation */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">
                          {audit.sublocation ||
                            "—"}
                        </td>

                        {/* Audit Areas */}

                        <td className="px-3 py-3">

                          <div className="flex flex-wrap gap-1 min-w-[140px]">

                            {(audit.auditAreas ||
                              [])
                              .slice(0, 2)
                              .map((area) => (
                                <span
                                  key={area}
                                  className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px] whitespace-nowrap"
                                >
                                  {area}
                                </span>
                              ))}

                            {(audit.auditAreas ||
                              []).length >
                              2 && (
                              <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                                +
                                {(audit.auditAreas ||
                                  []).length -
                                  2}
                              </span>
                            )}

                            {(audit.auditAreas ||
                              []).length ===
                              0 && (
                              <span className="text-[11px] text-on-surface-variant">
                                —
                              </span>
                            )}

                          </div>

                        </td>

                        {/* Auditors */}

                        <td className="px-3 py-3">

                          <div className="space-y-0.5 min-w-[120px]">

                            {(audit.auditors ||
                              []).length >
                            0 ? (
                              audit.auditors.map(
                                (auditor) => (
                                  <p
                                    key={auditor}
                                    className="font-label-md text-[11px] text-on-surface-variant whitespace-nowrap"
                                  >
                                    {auditor}
                                  </p>
                                )
                              )
                            ) : (
                              <p className="font-label-md text-[11px] text-on-surface-variant whitespace-nowrap">
                                Unassigned
                              </p>
                            )}

                          </div>

                        </td>

                        {/* Dates */}

                        <td className="px-3 py-3">

                          <p className="font-data-mono text-[11px] text-on-surface-variant whitespace-nowrap">

                            {new Date(
                              audit.startDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month:
                                  "short",
                              }
                            )}

                            {" – "}

                            {new Date(
                              audit.endDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month:
                                  "short",
                                year: "2-digit",
                              }
                            )}

                          </p>

                        </td>

                        {/* Coordinator */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">
                          {audit.auditCoordinator ||
                            "—"}
                        </td>

                        {/* Pramukh */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">
                          {audit.prakalphaPramukh ||
                            "—"}
                        </td>

                        {/* Mail */}

                        {showMailColumn && (
                        <td className="px-3 py-3">

                          {audit.mailSent ? (
                            <span className="flex items-center gap-1 text-secondary text-[11px] font-label-md whitespace-nowrap">

                              <span className="material-symbols-outlined text-[14px]">
                                mark_email_read
                              </span>

                              Sent

                            </span>
                          ) : canManage ? (
                            <button
                              title="Notify about audit being scheduled"
                              onClick={() =>
                                setMailTarget(
                                  audit
                                )
                              }
                              className="text-primary hover:underline text-[11px] inline-flex items-center whitespace-nowrap"
                            >

                              <span className="material-symbols-outlined text-[14px] mr-1">
                                mail
                              </span>

                              Send Mail

                            </button>
                          ) : null}

                        </td>
                        )}

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          {canManage ? (
                            <div className="flex items-center justify-center">
                              {audit.status === "completed" ? (
                                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase text-green-700">
                                  Completed
                                </span>
                              ) : canMarkCompleted(audit) ? (
                                <div className="relative group">
                                  <button
                                    type="button"
                                    onClick={() => openCompletionReview(audit)}
                                    title="Mark as Completed"
                                    aria-label="Mark as Completed"
                                    className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50"
                                  >
                                    <span className="material-symbols-outlined text-[20px]">
                                      task_alt
                                    </span>
                                  </button>
                                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                                    Mark as Completed
                                  </div>
                                </div>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">
                                  Upcoming
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              {(() => {
                                const stage = getStatus(audit);
                                return (
                                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase whitespace-nowrap ${
                                    stage === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : stage === "ongoing"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-amber-100 text-amber-800"
                                  }`}>
                                    {stage === "completed"
                                      ? "Completed"
                                      : stage === "ongoing"
                                        ? "In Progress"
                                        : "Upcoming"}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>

                        {/* Actions */}

                        {showActionsColumn && (
                          <td className="px-3 py-3">

                            <div className="flex gap-2 whitespace-nowrap">

                              {canManage ? (
                                <>
                                  {currentUser.role === "audit_coordinator" &&
                                    audit.auditCoordinator === currentUser.name &&
                                    audit.workflowMode !== "consolidated" &&
                                    (receivedFindings[String(audit._id || audit.id || "")]?.received ?? 0) > 0 && (
                                      <button type="button"
                                        onClick={() => navigate(`/coordinator-findings?scheduledAuditId=${encodeURIComponent(String(audit._id || audit.id || ""))}`)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5">
                                        Check Findings
                                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px]">
                                          {receivedFindings[String(audit._id || audit.id || "")]?.awaitingReview ?? 0} awaiting review
                                        </span>
                                      </button>
                                    )}
                                  {audit.status !== "completed" && (
                                    <button
                                      onClick={() => openEdit(audit)}
                                      className="p-1.5 rounded-lg hover:bg-surface-container"
                                      title="Edit Scheduled Audit"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        edit
                                      </span>
                                    </button>
                                  )}

                                  {audit.status !== "completed" &&
                                    (currentUser.role === "admin" ||
                                      currentUser.role === "super_admin" ||
                                      (currentUser.role === "audit_coordinator" &&
                                        audit.auditCoordinator === currentUser.name)) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setUnscheduleError("");
                                          setUnscheduleTarget(audit);
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-700"
                                        title="Unschedule Audit"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">
                                          event_busy
                                        </span>
                                      </button>
                                    )}
                                </>
                              ) : (
                                <>
                                  {isMyLeadAssignment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const params = new URLSearchParams({
                                          scheduledAuditId:
                                            audit.id || audit._id || "",
                                          workflowMode:
                                            audit.workflowMode ?? "legacy",
                                          iqaNumber: audit.iqaNumber || "",
                                          prakalpa: audit.prakalpa || "",
                                          location: audit.location || "",
                                          sublocation: audit.sublocation || "",
                                          startDate: audit.startDate || "",
                                          endDate: audit.endDate || "",
                                          auditCoordinator:
                                            audit.auditCoordinator || "",
                                        });
                                        navigate(
                                          `/lead-findings?${params.toString()}`
                                        );
                                      }}
                                      className="px-2 py-1.5 rounded-lg border border-primary/30 text-primary text-[11px] font-semibold hover:bg-primary/5 whitespace-nowrap"
                                    >
                                      Review Findings
                                    </button>
                                  )}
                                  {canAddFindingsForAudit(audit) ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openFindingDialog(audit)
                                      }
                                      className="px-2 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 whitespace-nowrap"
                                    >
                                      Add Findings
                                    </button>
                                  ) : null}
                                  {!isMyLeadAssignment && !canAddFindingsForAudit(audit) && (
                                    <span className="px-2 text-sm text-on-surface-variant">—</span>
                                  )}
                                </>
                              )}

                            </div>

                          </td>
                        )}

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

          <div className="p-4 border-t border-outline-variant/10 font-label-md text-on-surface-variant">

            {filtered.length} of{" "}
            {scheduledAudits.length} audits ·{" "}

            {
              filtered.filter(
                (s) =>
                  getStatus(s) ===
                  "ongoing"
              ).length
            }{" "}
            ongoing ·{" "}

            {
              filtered.filter(
                (s) =>
                  getStatus(s) ===
                  "upcoming"
              ).length
            }{" "}
            upcoming

          </div>

        </div>
      )}

      {unscheduleTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unschedule-heading"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 id="unschedule-heading" className="text-lg font-bold">
              Unschedule Audit?
            </h3>
            <p className="mt-3 text-sm text-gray-600">
              {unscheduleTarget.iqaNumber} will return to Pending Audit Plans.
              The Audit Plan itself will not be deleted.
            </p>
            {unscheduleError && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {unscheduleError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isUnscheduling}
                onClick={() => setUnscheduleTarget(null)}
                className="rounded-lg border px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnscheduling}
                onClick={handleUnschedule}
                className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                {isUnscheduling ? "Unscheduling..." : "Confirm Unschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {findingDialogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeFindingDialog}
          />

          <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-floating">

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/10 p-5">

              <div>
                <h3 className="font-headline-sm text-on-surface">
                  Audit Findings
                </h3>

                <p className="mt-1 font-body-md text-on-surface-variant">
                  {findingDialogTarget.iqaNumber} · {findingDialogTarget.prakalpa}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFindingDialog}
                className="rounded-lg p-1.5 hover:bg-surface-container"
                aria-label="Close findings dialog"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
            <div className="mx-6 mt-5 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Audit Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                {([
                  ["IQA Number", findingDialogTarget.iqaNumber],
                  ["Prakalpa", findingDialogTarget.prakalpa],
                  ["Location", [findingDialogTarget.location, findingDialogTarget.sublocation].filter(Boolean).join(" · ")],
                  ["Start Date", findingDialogTarget.startDate ? new Date(findingDialogTarget.startDate).toLocaleDateString() : ""],
                  ["End Date", findingDialogTarget.endDate ? new Date(findingDialogTarget.endDate).toLocaleDateString() : ""],
                  ["Lead Auditor", findingDialogTarget.leadAuditor],
                  ["Audit Coordinator", findingDialogTarget.auditCoordinator],
                  ["Status", findingDialogTarget.status],
                ] as [string, string | undefined][]).map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <p className="text-xs text-on-surface-variant">{label}</p>
                    <p className="break-words font-semibold text-on-surface">
                      {value || "Not specified"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-6 mt-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Audit Areas
              </h4>
              {(findingDialogTarget.auditAreas || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {findingDialogTarget.auditAreas.map((area, index) => (
                    <span
                      key={`${area}-${index}`}
                      className="rounded-lg border border-outline-variant/30 bg-white px-3 py-2 text-sm font-medium text-on-surface"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  No audit areas are recorded for this scheduled audit.
                </p>
              )}
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_1.6fr]">

              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">

                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="font-label-md text-on-surface-variant uppercase tracking-wider">
                    My Findings
                  </h4>

                  <button
                    type="button"
                    disabled={auditorBatchSubmitted || findingLoading || Boolean(findingError)}
                    onClick={() => {
                      setSelectedFindingId(null);
                      setFindingDescription("");
                      setFindingClassification("");
                      setFindingError("");
                      setFindingMessage("");
                    }}
                    className="rounded-lg border border-outline-variant px-2 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container"
                  >
                    New Draft
                  </button>
                </div>

                {findingLoading ? (
                  <p className="text-sm text-on-surface-variant">Loading findings…</p>
                ) : findingDrafts.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    {findingError
                      ? "Unable to verify findings and submission status."
                      : auditorBatchSubmitted
                        ? "No findings in this Auditor's submitted batch."
                        : "No findings created yet. Use New Draft to record an observation."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {findingDrafts.map((finding) => {
                      const isDraft =
                        String(finding.status).toUpperCase() === "DRAFT" ||
                        finding.workflowStatus === "auditor_draft";

                      const findingId = finding._id || finding.id || "";

                      return (
                        <button
                          key={findingId}
                          type="button"
                          onClick={() => fillFindingForm(finding)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selectedFindingId === findingId
                              ? "border-primary bg-primary/5"
                              : "border-outline-variant/20 bg-white hover:bg-surface-container-low"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-body-md font-medium text-on-surface">
                                {finding.description || finding.findings || "Untitled finding"}
                              </p>
                              <p className="mt-1 text-[11px] text-on-surface-variant">
                                {finding.classification || "Unclassified"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isDraft
                                  ? "bg-secondary/10 text-secondary"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {isDraft ? "DRAFT" : "SUBMITTED"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>

              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">

                <h4 className="font-label-md text-on-surface-variant uppercase tracking-wider">
                  {selectedFindingId ? "Edit Draft" : "New Draft"}
                </h4>

                {findingError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {findingError}
                  </div>
                )}

                {findingMessage && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {findingMessage}
                  </div>
                )}

                <div className="mt-4 space-y-4">

                  <div>
                    <label className="mb-1 block font-label-md text-on-surface-variant">
                      Finding Description
                    </label>
                    <textarea
                      value={findingDescription}
                      onChange={(e) => setFindingDescription(e.target.value)}
                      disabled={auditorBatchSubmitted || Boolean(
                        selectedFindingId &&
                          !findingDrafts.find((item) => (item._id || item.id) === selectedFindingId)?.status?.toUpperCase()?.includes("DRAFT") &&
                          !findingDrafts.find((item) => (item._id || item.id) === selectedFindingId)?.workflowStatus?.includes("auditor_draft")
                      )}
                      rows={6}
                      className="w-full rounded-xl border border-outline-variant bg-white p-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100"
                      placeholder="Describe the issue noted during the audit."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-label-md text-on-surface-variant">
                      Classification
                    </label>
                    <select
                      value={findingClassification}
                      onChange={(e) => setFindingClassification(e.target.value as "NC" | "OFI" | "")}
                      disabled={auditorBatchSubmitted || findingLoading || Boolean(findingError)}
                      className="w-full rounded-xl border border-outline-variant bg-white p-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select classification</option>
                      <option value="NC">NC</option>
                      <option value="OFI">OFI</option>
                    </select>
                  </div>

                  {!selectedFindingId && (
                    <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
                      <p className="font-semibold">Add Proof / Evidence</p>
                      <p className="mt-1">
                        Enter your finding and click Create Draft below.
                        The photo/PDF upload option will appear here immediately,
                        before you submit the finding to the Lead Auditor.
                      </p>
                    </div>
                  )}

                  {selectedFindingId && (() => {
                    const item = findingDrafts.find(f => (f._id || f.id) === selectedFindingId);
                    return item ? <FindingEvidence findingId={selectedFindingId!} files={item.proofFiles} canUpload={!auditorBatchSubmitted && item.workflowStatus === "auditor_draft"} onUploaded={() => loadFindingDialogData(findingDialogTarget!)} /> : null;
                  })()}
                  {selectedFindingId && (() => {
                    const selectedFinding = findingDrafts.find(
                      (item) => (item._id || item.id) === selectedFindingId
                    );

                    const isUnlockedDraft =
                      selectedFinding &&
                      (String(selectedFinding.status).toUpperCase() === "DRAFT" ||
                        selectedFinding.workflowStatus === "auditor_draft");

                    return !isUnlockedDraft ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        This finding has already been submitted and cannot be edited through the draft form.
                      </div>
                    ) : null;
                  })()}

                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeFindingDialog}
                    className="rounded-lg border border-outline-variant px-4 py-2 font-semibold text-on-surface hover:bg-surface-container"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    disabled={auditorBatchSubmitted || findingLoading || Boolean(findingError) || findingSaving || !findingDescription.trim()}
                    onClick={handleSaveFindingDraft}
                    className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {findingSaving ? "Saving..." : selectedFindingId ? "Save Draft" : "Create Draft"}
                  </button>

                  {findingLoading ? (
                    <div role="status" className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface-variant">
                      Checking submission status…
                    </div>
                  ) : findingError ? (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      Submission status could not be verified. Editing and submission are disabled.
                    </div>
                  ) : auditorBatchSubmitted ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                      {findingDrafts.length === 0
                        ? "Final No Findings submission recorded. This batch is permanently locked."
                        : "Final submission sent. This batch is permanently locked."}
                    </div>
                  ) : (
                    <button type="button" disabled={findingSubmitting || findingLoading || Boolean(findingError)}
                      onClick={() => { setBatchAcknowledged(false); setShowBatchConfirm(true); }}
                      className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                      Confirm &amp; Send All to Lead Auditor
                    </button>
                  )}
                </div>

              </div>

            </div>

            </div>

          </div>

        </div>
      )}

      {findingDialogTarget && showBatchConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Confirm final Auditor submission">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-on-surface">Send All Findings to Lead Auditor?</h3>
            <p className="mt-3 text-sm text-on-surface-variant">
              Please review every finding and its evidence once more. Once sent, findings cannot be edited, recalled, unsent or supplemented.
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              {findingDrafts.length === 0 ? "No Findings: you are confirming an empty submission." : `${findingDrafts.length} finding(s) will be sent together.`}
            </p>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant p-3 text-sm">
              <input type="checkbox" checked={batchAcknowledged} onChange={(e) => setBatchAcknowledged(e.target.checked)} className="mt-1" />
              <span>I have reviewed all findings and understand that this submission is final and cannot be edited or unsent.</span>
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setShowBatchConfirm(false)} className="rounded-lg border border-outline-variant px-4 py-2">Review Again</button>
              <button type="button" disabled={!batchAcknowledged || findingSubmitting} onClick={handleSubmitFindingBatch} className="rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {findingSubmitting ? "Sending..." : "Confirm & Send All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeEdit}
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">

            <div className="p-6 border-b border-outline-variant/10">

              <h3 className="font-headline-sm">
                Edit Scheduled Audit
              </h3>

              <p className="font-data-mono text-[11px] text-primary mt-1">
                {editTarget.iqaNumber}
              </p>

              <p className="font-body-md text-on-surface-variant mt-0.5">
                {editTarget.prakalpa} —{" "}
                {editTarget.location}
              </p>

            </div>

            <div className="p-6 space-y-5">

              {editError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="font-label-md text-on-surface-variant block mb-1">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      editStartDate
                    }
                    onChange={(e) =>
                      setEditStartDate(
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                  />

                </div>

                <div>

                  <label className="font-label-md text-on-surface-variant block mb-1">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={
                      editEndDate
                    }
                    onChange={(e) =>
                      setEditEndDate(
                        e.target.value
                      )
                    }
                    min={
                      editStartDate
                    }
                    disabled={saving}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                  />

                </div>

              </div>

              <div>

                <label className="font-label-md text-on-surface-variant block mb-1">
                  Audit Coordinator
                </label>

                <select
                  value={
                    editCoordinator
                  }
                  onChange={(e) =>
                    setEditCoordinator(
                      e.target.value
                    )
                  }
                  disabled={saving}
                  className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                >

                  <option value="">
                    Select Coordinator
                  </option>

                  {editCoordinator &&
                    !AUDIT_COORDINATORS.includes(
                      editCoordinator
                    ) && (
                      <option
                        value={
                          editCoordinator
                        }
                      >
                        {editCoordinator}
                      </option>
                    )}

                  {AUDIT_COORDINATORS.map(
                    (coordinator) => (
                      <option
                        key={
                          coordinator
                        }
                        value={
                          coordinator
                        }
                      >
                        {coordinator}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>
                <label className="font-label-md text-on-surface-variant block mb-1">Lead Auditor</label>
                <select value={editLeadAuditor} onChange={(e) => setEditLeadAuditor(e.target.value)} disabled={saving} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100">
                  <option value="">Select Lead Auditor</option>
                  {editAuditors.filter((name) => auditors.includes(name)).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>

                <label className="font-label-md text-on-surface-variant block mb-2">
                  Auditors
                </label>

                {auditorDirectoryError && (
                  <p role="alert" className="text-sm text-red-600 mb-2">
                    {auditorDirectoryError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">

                  {auditors.map(
                    (auditor) => (
                      <button
                        key={
                          auditor
                        }
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          toggleAuditor(
                            auditor
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all disabled:opacity-60 ${
                          editAuditors.includes(
                            auditor
                          )
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-white text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {auditor}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    closeEdit
                  }
                  disabled={saving}
                  className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveEdit
                  }
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* Send Scheduled Audit Email */}

      {mailTarget && (
        <SendScheduledAuditEmailModal
          audit={{
            _id:
              mailTarget._id ||
              mailTarget.id,
            id:
              mailTarget.id,
            iqaNumber:
              mailTarget.iqaNumber,
            prakalpa:
              mailTarget.prakalpa,
            location:
              mailTarget.location,
            startDate:
              mailTarget.startDate,
            endDate:
              mailTarget.endDate,
            auditCoordinator:
              mailTarget.auditCoordinator,
          }}
          onClose={() =>
            setMailTarget(null)
          }
          onSent={async () => {
            await loadScheduledAudits();
          }}
        />
      )}

      {/* Complete Audit Verification Modal */}

      {completionTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!completing) {
                setCompletionTarget(null);
                setCompletionConfirmed(false);
                setCompletionError("");
              }
            }}
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-outline-variant/10">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="font-headline-sm font-bold text-on-surface">
                    Verify Audit Details
                  </h3>

                  <p className="font-body-md text-on-surface-variant mt-1">
                    Please verify all details before marking this audit as completed.
                  </p>

                </div>

                <button
                  type="button"
                  disabled={completing}
                  onClick={() => {
                    setCompletionTarget(null);
                    setCompletionConfirmed(false);
                    setCompletionError("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>

              </div>

            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Audit ID
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.iqaNumber}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Prakalpa
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.prakalpa || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.location || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Sublocation
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.sublocation || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Coordinator
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.auditCoordinator || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Pramukh
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.prakalphaPramukh || "—"}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="rounded-xl border border-outline-variant/20 p-4">

                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(
                      completionTarget.startDate
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-outline-variant/20 p-4">

                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    End Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(
                      completionTarget.endDate
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>

                </div>

              </div>

              <div className="rounded-xl border border-outline-variant/20 p-4">

                <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                  Audit Areas
                </p>

                <div className="flex flex-wrap gap-2">

                  {(completionTarget.auditAreas || []).length > 0 ? (
                    completionTarget.auditAreas?.map(
                      (area) => (
                        <span
                          key={area}
                          className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs"
                        >
                          {area}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-sm text-on-surface-variant">
                      —
                    </span>
                  )}

                </div>

              </div>

              <div className="rounded-xl border border-outline-variant/20 p-4">

                <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                  Auditors
                </p>

                <div className="flex flex-wrap gap-2">

                  {(completionTarget.auditors || []).length > 0 ? (
                    completionTarget.auditors?.map(
                      (auditor) => (
                        <span
                          key={auditor}
                          className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs"
                        >
                          {auditor}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-sm text-on-surface-variant">
                      Unassigned
                    </span>
                  )}

                </div>

              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">

                <input
                  type="checkbox"
                  checked={completionConfirmed}
                  onChange={(e) =>
                    setCompletionConfirmed(
                      e.target.checked
                    )
                  }
                  disabled={completing}
                  className="mt-1"
                />

                <div>

                  <p className="text-sm font-bold text-on-surface">
                    I have verified all audit details
                  </p>

                  <p className="text-xs text-on-surface-variant mt-1">
                    After confirmation, this Scheduled Audit and its linked Audit Plan will be marked Completed.
                  </p>

                </div>

              </label>

              {completionError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {completionError}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3">

              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  setCompletionTarget(null);
                  setCompletionConfirmed(false);
                  setCompletionError("");
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  const id =
                    completionTarget.id ||
                    completionTarget._id;

                  if (!id) {
                    setCompletionError(
                      "Scheduled Audit ID is missing."
                    );
                    return;
                  }

                  setCompletionTarget(null);
                  setCompletionConfirmed(false);
                  setCompletionError("");

                  navigate(
                    `/scheduled-audits/${id}/edit`
                  );
                }}
                className="px-4 py-2 border border-primary text-primary rounded-lg font-label-md font-bold hover:bg-primary/5 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px]">
                  edit
                </span>

                Edit Details
              </button>

              <button
                type="button"
                onClick={confirmCompletion}
                disabled={
                  completing ||
                  !completionConfirmed
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-label-md font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing
                  ? "Completing..."
                  : "Confirm & Mark Completed"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Generate Report Confirmation */}

      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setReportTarget(null)
            }
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10">

            <div className="p-6 border-b border-outline-variant/10">

              <h3 className="font-headline-sm">
                Generate Audit Report
              </h3>

              <p className="mt-2 font-data-mono text-primary text-[12px] font-bold">
                {reportTarget.iqaNumber}
              </p>

              <p className="mt-3 text-sm text-on-surface-variant font-body-md">
                Please verify that the audit has been completed before generating the report.
              </p>

            </div>

            <div className="p-6">

              <label className="flex items-start gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={
                    reportConfirmed
                  }
                  onChange={(e) =>
                    setReportConfirmed(
                      e.target.checked
                    )
                  }
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary/20"
                />

                <span className="font-body-md text-on-surface text-sm">
                  I confirm that this audit has been completed.
                </span>

              </label>

            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-outline-variant/10">

              <button
                onClick={() => {
                  setReportTarget(null);
                  setReportConfirmed(false);
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>

              <button
                disabled={
                  !reportConfirmed
                }
                onClick={() => {
                  const id =
                    reportTarget.id ||
                    reportTarget._id;

                  if (!id) return;

                  setReportTarget(null);
                  setReportConfirmed(false);

                  navigate(
                    `/create-report/${id}`
                  );
                }}
                className={`px-4 py-2 rounded-lg text-white font-label-md font-bold transition-all ${
                  reportConfirmed
                    ? "bg-primary hover:brightness-110 cursor-pointer"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Generate Report
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
