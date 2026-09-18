import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";

import {
  getScheduledAuditById,
} from "../services/scheduledAuditService";

import {
  createReport,
} from "../services/reportService";

interface ObservationItem {
  findings: string;
  severity: "open_for_improvement" | "non_conformance" | "";
  proofFiles: string[];
}

export default function CreateReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // STEP 1: Multi-observation state setup
  const [visitTime, setVisitTime] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [hasChecklist, setHasChecklist] = useState(false);
  const [observations, setObservations] = useState<ObservationItem[]>([
    {
      findings: "",
      severity: "",
      proofFiles: [],
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    try {
      const data = await getScheduledAuditById(id);
      setAudit(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for Observations & File Uploads
  const updateObservation = (
    index: number,
    field: "findings" | "severity",
    value: any
  ) => {
    setObservations((prev) =>
      prev.map((obs, i) =>
        i === index
          ? {
              ...obs,
              [field]: value,
            }
          : obs
      )
    );
  };

  const addObservation = () => {
    setObservations((prev) => [
      ...prev,
      {
        findings: "",
        severity: "",
        proofFiles: [],
      },
    ]);
  };

  const removeObservation = (index: number) => {
    if (index === 0) return;
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = Array.from(e.target.files || []).map((f) => f.name);
    setObservations((prev) =>
      prev.map((obs, i) =>
        i === index
          ? {
              ...obs,
              proofFiles: [...obs.proofFiles, ...selected],
            }
          : obs
      )
    );
  };

  const removeFileFromObservation = (obsIndex: number, fileIndex: number) => {
    setObservations((prev) =>
      prev.map((obs, i) =>
        i === obsIndex
          ? {
              ...obs,
              proofFiles: obs.proofFiles.filter((_, j) => j !== fileIndex),
            }
          : obs
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audit) return;
    for (const obs of observations) {
      if (!obs.findings.trim() || !obs.severity) return;
    }

    setSubmitting(true);
    try {
      const auditId = audit._id || audit.id;

      const report = await createReport({
        scheduledAuditId: auditId,
        scheduledAudit: auditId,
        visitDate: new Date(),
        visitTime,
        hasChecklist,
        observations,
      });

      // Handled array / single response from backend
      const count = Array.isArray(report)
        ? report.length
        : Array.isArray(report?.data)
        ? report.data.length
        : observations.length;

      setSuccess(`${count} reports generated`);

      setTimeout(() => {
        navigate("/all-reports");
      }, 1500);
    } catch (err) {
      console.error("Error creating report:", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 font-body-md text-on-surface-variant">Loading...</div>
    );
  }

  if (!audit) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">
          search_off
        </span>
        <p className="font-headline-sm text-on-surface-variant/50">
          Scheduled audit not found
        </p>
        <button
          onClick={() => navigate("/scheduled-audits")}
          className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold"
        >
          Back to Scheduled Audits
        </button>
      </div>
    );
  }

  // Updated Success Screen UI
  if (success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
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
              Your audit report(s) have been submitted successfully.
            </p>
          </div>
          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5">
            <p className="font-label-md text-on-surface-variant/70 mb-1">
              Reports Generated
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

  const assignedAuditors =
    audit.auditors && audit.auditors.length > 0
      ? audit.auditors.join(", ")
      : audit.finalAuditor || audit.auditCoordinator;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[800px] mx-auto space-y-6 min-w-0">
      <div>
        <h2 className="font-headline-md text-on-surface">Create Audit Report</h2>
        <p className="font-body-md text-on-surface-variant mt-0.5">
          Documenting findings for {audit.prakalpa}
        </p>
      </div>

      {/* Audit Info Banner */}
      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4 sm:p-5 grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "IQA Number", value: audit.iqaNumber },
          { label: "Prakalpa", value: audit.prakalpa },
          { label: "Auditor(s)", value: assignedAuditors },
          {
            label: "Audit Period",
            value: `${new Date(audit.startDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })} – ${new Date(audit.endDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}`,
          },
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
        <div className="p-4 sm:p-6 border-b border-outline-variant/10 bg-surface-container-lowest">
          <h3 className="font-headline-sm">Report Details</h3>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            All fields marked * are required.
          </p>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Report Date *
              </label>
              <input
                type="text"
                readOnly
                value={new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-low text-on-surface-variant cursor-not-allowed"
              />
              <p className="font-label-md text-on-surface-variant/50 mt-1 text-[10px]">
                Auto-filled
              </p>
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Time of Visit *
              </label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                required
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Auditor(s) *
              </label>
              <input
                type="text"
                readOnly
                value={assignedAuditors}
                className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-low text-on-surface-variant cursor-not-allowed"
              />
              <p className="font-label-md text-on-surface-variant/50 mt-1 text-[10px]">
                Auto-filled
              </p>
            </div>
          </div>

          <hr className="border-outline-variant/10" />

          {/* Dynamic Observations List */}
          <div className="space-y-6">
            {observations.map((observation, index) => (
              <div
                key={index}
                className="border border-outline-variant/20 rounded-xl p-5 space-y-5 bg-surface-container-lowest/30 relative"
              >
                <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                  <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[12px] font-bold flex items-center justify-center font-data-mono">
                      {index + 1}
                    </span>
                    Observation {index + 1}
                  </h3>

                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeObservation(index)}
                      className="text-error font-label-md text-sm hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                      Remove Observation
                    </button>
                  )}
                </div>

                {/* Classification / Severity */}
                <div>
                  <label className="font-label-md text-on-surface-variant block mb-2 font-semibold">
                    Classification *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(
                      [
                        "open_for_improvement",
                        "non_conformance",
                      ] as const
                    ).map((severity) => (
                      <button
                        key={severity}
                        type="button"
                        onClick={() =>
                          updateObservation(index, "severity", severity)
                        }
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          observation.severity === severity
                            ? severity === "non_conformance"
                              ? "border-error bg-error/5"
                              : "border-primary bg-primary/5"
                            : "border-outline-variant/40 hover:border-on-surface-variant/30 hover:bg-surface-container-lowest"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              observation.severity === severity
                                ? severity === "non_conformance"
                                  ? "text-error"
                                  : "text-primary"
                                : "text-on-surface-variant/50"
                            }`}
                          >
                            {severity === "non_conformance"
                              ? "error_outline"
                              : "info"}
                          </span>
                          <span
                            className={`font-label-md font-bold text-sm ${
                              observation.severity === severity
                                ? severity === "non_conformance"
                                  ? "text-error"
                                  : "text-primary"
                                : "text-on-surface-variant"
                            }`}
                          >
                            {severity === "non_conformance"
                              ? "Non-Conformance (NC)"
                              : "Open For Improvement (OFI)"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Finding Description */}
                <div>
                  <label className="font-label-md text-on-surface-variant block mb-1 font-semibold">
                    Finding *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={observation.findings}
                    onChange={(e) =>
                      updateObservation(index, "findings", e.target.value)
                    }
                    placeholder="Describe the finding in detail..."
                    className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all text-sm"
                  />
                  <p className="font-label-md text-on-surface-variant/50 mt-1 text-[11px]">
                    {observation.findings.length} characters
                  </p>
                </div>

                {/* Evidence Files */}
                <div>
                  <label className="font-label-md text-on-surface-variant block mb-2 font-semibold">
                    Evidence / Proof Files
                  </label>
                  <div
                    className="border-2 border-dashed border-outline-variant/40 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-lowest transition-colors cursor-pointer group"
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40 group-hover:text-primary transition-colors">
                      cloud_upload
                    </span>
                    <p className="font-body-md text-xs font-semibold text-on-surface">
                      Click to upload evidence for Observation {index + 1}
                    </p>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[index] = el;
                      }}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.mp4,.mov,.docx"
                      className="hidden"
                      onChange={(e) => handleFileChange(index, e)}
                    />
                  </div>

                  {observation.proofFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {observation.proofFiles.map((file, fileIdx) => (
                        <div
                          key={fileIdx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-secondary/5 border border-secondary/20 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-secondary text-[16px]">
                            attach_file
                          </span>
                          <span className="font-label-md text-secondary text-xs">
                            {file}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeFileFromObservation(index, fileIdx)
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
              </div>
            ))}
          </div>

          {/* Add Observation Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={addObservation}
              className="px-5 py-2.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-all font-label-md font-bold text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Another Observation
            </button>
          </div>

          {/* Checklist Switch */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
            <input
              type="checkbox"
              id="checklist"
              checked={hasChecklist}
              onChange={(e) => setHasChecklist(e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="checklist" className="flex-1 cursor-pointer">
              <p className="font-label-md font-semibold text-on-surface">
                Upload Audit Report Checklist
              </p>
              <p className="font-label-md text-on-surface-variant/60 text-[11px]">
                (Optional) Attach the completed checklist for this audit
              </p>
            </label>
          </div>

          {/* Observation Summary UX Banner */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1">
            <p className="font-semibold text-on-surface font-label-md text-sm">
              This audit currently contains{" "}
              <strong className="text-primary font-bold">
                {observations.length}
              </strong>{" "}
              observation(s).
            </p>
            <p className="text-xs text-on-surface-variant font-body-md">
              Each observation will generate one Report (IQR) while sharing the same IQA Number.
            </p>
          </div>
        </div>

        {/* Form Footer & Submit Button */}
        <div className="p-4 sm:p-6 sm:pt-0 border-t border-outline-variant/10 bg-surface-container-lowest flex flex-col sm:flex-row gap-3">
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
              submitting ||
              observations.some(
                (o) => !o.findings.trim() || !o.severity
              )
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
                Submitting Reports...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                Submit {observations.length} Report{observations.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}