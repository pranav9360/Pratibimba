import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";
import { useLocation, useParams } from "wouter";
import {
  createReport,
  getScheduledAudits,
  type AuditPlan,
  type Location,
  type Prakalpa,
  type ScheduledAudit
} from "../lib/api";

type ScheduledAuditWithOptionalId = ScheduledAudit & {
  id?: string;
};

type ReportForm = {
  internalAuditDate: string;
  timeVisited: string;
  classification: "OFI" | "NC" | "";
  auditArea: string;
  auditFindings: string;
  dueDate: string;
  hasChecklist: boolean;
};

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getAuditId(audit: ScheduledAudit) {
  if (audit.auditId) return audit.auditId;

  if (
    typeof audit.auditPlanId === "object" &&
    audit.auditPlanId &&
    "auditId" in audit.auditPlanId
  ) {
    return (audit.auditPlanId as AuditPlan).auditId;
  }

  return "Unknown Audit";
}

function getAuditPlanMongoId(audit: ScheduledAudit) {
  if (
    typeof audit.auditPlanId === "object" &&
    audit.auditPlanId &&
    "_id" in audit.auditPlanId
  ) {
    return (audit.auditPlanId as AuditPlan)._id;
  }

  if (typeof audit.auditPlanId === "string") {
    return audit.auditPlanId;
  }

  return "";
}

function getPrakalpaName(audit: ScheduledAudit) {
  if (
    typeof audit.prakalpaId === "object" &&
    audit.prakalpaId &&
    "name" in audit.prakalpaId
  ) {
    return (audit.prakalpaId as Prakalpa).name;
  }

  return "Unknown Prakalpa";
}

function getLocationName(audit: ScheduledAudit) {
  if (
    typeof audit.locationId === "object" &&
    audit.locationId &&
    "name" in audit.locationId
  ) {
    return (audit.locationId as Location).name;
  }

  return "No location";
}

function getAuditorName(audit: ScheduledAudit) {
  return audit.finalizedAuditor || "No auditor";
}

function defaultForm(audit?: ScheduledAudit | null): ReportForm {
  return {
    internalAuditDate: todayDate(),
    timeVisited: new Date().toTimeString().slice(0, 5),
    classification: "",
    auditArea: audit?.auditAreas?.[0] || "",
    auditFindings: "",
    dueDate: "",
    hasChecklist: false
  };
}

function findScheduledAuditByRouteId(
  audits: ScheduledAudit[],
  routeId?: string
) {
  if (!routeId) return null;

  return (
    audits.find((audit) => {
      const auditWithId = audit as ScheduledAuditWithOptionalId;

      return (
        audit._id === routeId ||
        auditWithId.id === routeId ||
        audit.auditId === routeId ||
        getAuditPlanMongoId(audit) === routeId ||
        getAuditId(audit) === routeId
      );
    }) || null
  );
}

export default function CreateReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [audit, setAudit] = useState<ScheduledAudit | null>(null);
  const [allAudits, setAllAudits] = useState<ScheduledAudit[]>([]);
  const [form, setForm] = useState<ReportForm>(() => defaultForm());
  const [files, setFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function setField<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).map(
      (file) => file.name
    );
    setFiles((previous) => [...previous, ...selected]);
  }

  useEffect(() => {
    async function loadAudit() {
      try {
        setPageError("");

        const audits = await getScheduledAudits();
        const selectedAudit = findScheduledAuditByRouteId(audits, id);

        setAllAudits(audits);
        setAudit(selectedAudit);
        setForm(defaultForm(selectedAudit));
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Failed to load scheduled audit"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAudit();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!audit) {
      return;
    }

    if (!form.classification || !form.auditFindings.trim()) {
      setFormError("Classification and audit findings are required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const report = await createReport({
        scheduledAuditId: audit._id,
        internalAuditDate: form.internalAuditDate,
        timeVisited: form.timeVisited,
        auditArea: form.auditArea.trim(),
        auditFindings: form.auditFindings.trim(),
        classification: form.classification,
        dueDate: form.dueDate || undefined,
        proofUrl: files.length > 0 ? files.join(", ") : undefined,
        checklistUrl: form.hasChecklist
          ? "Checklist marked as uploaded"
          : undefined
      });

      setSuccess(report.reportId);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create report"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading scheduled audit...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">Create report failed to load</p>
          <p className="font-body-md mt-1">{pageError}</p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">
          search_off
        </span>

        <div className="text-center">
          <p className="font-headline-sm text-on-surface-variant/70">
            Scheduled audit not found
          </p>
          <p className="font-body-md text-on-surface-variant/50 mt-1">
            Route ID: {id || "missing"} · Loaded audits: {allAudits.length}
          </p>
        </div>

        <button
          onClick={() => navigate("/scheduled-audits")}
          className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold"
        >
          Back to Scheduled Audits
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-secondary text-[40px] filled">
              check_circle
            </span>
          </div>

          <div>
            <h2 className="font-headline-md text-on-surface mb-2">
              Report Created!
            </h2>
            <p className="font-body-md text-on-surface-variant">
              Your audit report has been saved to MongoDB successfully.
            </p>
          </div>

          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5">
            <p className="font-label-md text-on-surface-variant/70 mb-1">
              Report Number
            </p>
            <p className="font-data-mono text-[20px] font-black text-secondary">
              {success}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/all-reports")}
              className="flex-1 py-3 bg-surface-container border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-high transition-colors"
            >
              View All Reports
            </button>

            <button
              onClick={() => navigate("/scheduled-audits")}
              className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold"
            >
              Back to Scheduled
            </button>
          </div>
        </div>
      </div>
    );
  }

  const auditAreas = audit.auditAreas || [];

  return (
    <div className="p-8 max-w-[850px] mx-auto space-y-6">
      <div>
        <h2 className="font-headline-md text-on-surface">
          Create Audit Report
        </h2>
        <p className="font-body-md text-on-surface-variant mt-0.5">
          Documenting findings for {getPrakalpaName(audit)}
        </p>
      </div>

      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Audit ID", value: getAuditId(audit) },
          { label: "Prakalpa", value: getPrakalpaName(audit) },
          { label: "Location", value: getLocationName(audit) },
          { label: "Final Auditor", value: getAuditorName(audit) },
          {
            label: "Audit Period",
            value: `${formatDate(audit.auditStartDate)} – ${formatDate(
              audit.auditEndDate
            )}`
          },
          { label: "Coordinator", value: audit.auditCoordinator || "-" },
          { label: "Status", value: audit.status || "scheduled" },
          { label: "Planned Date", value: formatDate(audit.auditPlannedDate) }
        ].map((item) => (
          <div key={item.label}>
            <p className="font-label-md text-on-surface-variant/70">
              {item.label}
            </p>
            <p className="font-body-md font-semibold text-on-surface mt-0.5">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden"
      >
        <div className="p-6 border-b border-outline-variant/10 bg-surface-container-lowest">
          <h3 className="font-headline-sm">Report Details</h3>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            All fields marked * are required.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-body-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Internal Audit Date *
              </label>
              <input
                type="date"
                value={form.internalAuditDate}
                onChange={(event) =>
                  setField("internalAuditDate", event.target.value)
                }
                required
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Time Visited *
              </label>
              <input
                type="time"
                value={form.timeVisited}
                onChange={(event) => setField("timeVisited", event.target.value)}
                required
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Auditor
              </label>
              <input
                type="text"
                readOnly
                value={getAuditorName(audit)}
                className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-low text-on-surface-variant cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Area
            </label>

            {auditAreas.length > 0 ? (
              <select
                value={form.auditArea}
                onChange={(event) => setField("auditArea", event.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="">Select audit area</option>
                {auditAreas.map((area) => (
                  <option key={area}>{area}</option>
                ))}
              </select>
            ) : (
              <input
                value={form.auditArea}
                onChange={(event) => setField("auditArea", event.target.value)}
                placeholder="Example: Documentation, Finance, Operations"
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            )}
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">
              Classification of Findings *
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["OFI", "NC"] as const).map((classification) => (
                <button
                  key={classification}
                  type="button"
                  onClick={() => setField("classification", classification)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    form.classification === classification
                      ? classification === "NC"
                        ? "border-error bg-error/5"
                        : "border-primary bg-primary/5"
                      : "border-outline-variant hover:border-on-surface-variant/30 hover:bg-surface-container-lowest"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`material-symbols-outlined text-[24px] ${
                        form.classification === classification
                          ? classification === "NC"
                            ? "text-error"
                            : "text-primary"
                          : "text-on-surface-variant/50"
                      }`}
                    >
                      {classification === "NC" ? "error_outline" : "info"}
                    </span>

                    <span
                      className={`font-label-md font-bold ${
                        form.classification === classification
                          ? classification === "NC"
                            ? "text-error"
                            : "text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {classification === "NC"
                        ? "Non-Conformance"
                        : "Open for Improvement"}
                    </span>

                    {form.classification === classification && (
                      <span className="material-symbols-outlined text-[18px] ml-auto text-secondary filled">
                        check_circle
                      </span>
                    )}
                  </div>

                  <p className="font-label-md text-on-surface-variant/70">
                    {classification === "NC"
                      ? "A deficiency that requires corrective action."
                      : "An opportunity to improve process or documentation."}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {form.classification === "NC" && (
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Due Date for Corrective Action
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setField("dueDate", event.target.value)}
                min={form.internalAuditDate}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          )}

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Findings *
            </label>
            <textarea
              value={form.auditFindings}
              onChange={(event) => setField("auditFindings", event.target.value)}
              rows={5}
              required
              placeholder="Describe the audit findings in detail..."
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
            />
            <p className="font-label-md text-on-surface-variant/50 mt-1">
              {form.auditFindings.length} characters
            </p>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">
              Proof / Evidence
            </label>
            <div
              className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-surface-container-lowest transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30 group-hover:text-primary transition-colors">
                cloud_upload
              </span>
              <p className="font-body-md font-semibold text-on-surface">
                Click to select evidence
              </p>
              <p className="font-label-md text-on-surface-variant/60">
                For now, file names are saved as proof reference.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.mp4,.mov,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((fileName, index) => (
                  <div
                    key={`${fileName}-${index}`}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary/5 border border-secondary/20 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-secondary text-[16px]">
                      attach_file
                    </span>
                    <span className="font-label-md text-secondary">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((previous) =>
                          previous.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="material-symbols-outlined text-[14px] text-on-surface-variant/50 hover:text-error ml-1"
                    >
                      close
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
            <input
              type="checkbox"
              id="checklist"
              checked={form.hasChecklist}
              onChange={(event) => setField("hasChecklist", event.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />

            <label htmlFor="checklist" className="flex-1 cursor-pointer">
              <p className="font-label-md font-semibold text-on-surface">
                Audit report checklist completed
              </p>
              <p className="font-label-md text-on-surface-variant/60 text-[11px]">
                Optional marker saved with report.
              </p>
            </label>
          </div>
        </div>

        <div className="p-6 pt-0 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/scheduled-audits")}
            className="px-6 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              submitting || !form.classification || !form.auditFindings.trim()
            }
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                Submit Report
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}