import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useApp } from "../context/app-context";

export default function CreateReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { scheduledAudits, currentUser, createReport } = useApp();

  const audit = scheduledAudits.find((s) => s.id === id);

  const [form, setForm] = useState({
    visitTime: new Date().toTimeString().slice(0, 5),
    severity: "" as "open_for_improvement" | "non_conformance" | "",
    findings: "",
    hasChecklist: false,
  });
  const [files, setFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).map((f) => f.name);
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audit || !form.severity || !form.findings.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const report = createReport({
        iqaNumber: audit.iqaNumber,
        prakalpa: audit.prakalpa,
        domain: audit.domain,
        location: audit.location,
        sublocation: audit.sublocation,
        auditor: currentUser.name || audit.finalAuditor,
        visitDate: new Date().toISOString().split("T")[0],
        visitTime: form.visitTime,
        severity: form.severity as "open_for_improvement" | "non_conformance",
        findings: form.findings,
        proofFiles: files,
        hasChecklist: form.hasChecklist,
        observations: [],
      });
      setSubmitting(false);
      setSuccess(report.iqrNumber);
    }, 800);
  };

  if (!audit) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">search_off</span>
        <p className="font-headline-sm text-on-surface-variant/50">Scheduled audit not found</p>
        <button onClick={() => navigate("/scheduled-audits")} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold">Back to Scheduled Audits</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-secondary text-[40px] filled">check_circle</span>
          </div>
          <div>
            <h2 className="font-headline-md text-on-surface mb-2">Report Created!</h2>
            <p className="font-body-md text-on-surface-variant">Your audit report has been submitted successfully.</p>
          </div>
          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5">
            <p className="font-label-md text-on-surface-variant/70 mb-1">Report Number</p>
            <p className="font-data-mono text-[20px] font-black text-secondary">{success}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/all-reports")} className="flex-1 py-3 bg-surface-container border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-high transition-colors">View All Reports</button>
            <button onClick={() => navigate("/scheduled-audits")} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold">Back to Scheduled</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[800px] mx-auto space-y-6">
      <div>
        <h2 className="font-headline-md text-on-surface">Create Audit Report</h2>
        <p className="font-body-md text-on-surface-variant mt-0.5">Documenting findings for {audit.prakalpa}</p>
      </div>

      {/* Audit Info Banner */}
      <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "IQA Number", value: audit.iqaNumber },
          { label: "Prakalpa", value: audit.prakalpa },
          { label: "Final Auditor", value: audit.finalAuditor },
          { label: "Audit Period", value: `${new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` },
        ].map((item) => (
          <div key={item.label}>
            <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
            <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 bg-surface-container-lowest">
          <h3 className="font-headline-sm">Report Details</h3>
          <p className="font-body-md text-on-surface-variant mt-0.5">All fields marked * are required.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Auto-filled fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Report Date *</label>
              <input type="text" readOnly value={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-low text-on-surface-variant cursor-not-allowed" />
              <p className="font-label-md text-on-surface-variant/50 mt-1 text-[10px]">Auto-filled</p>
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Time of Visit *</label>
              <input type="time" value={form.visitTime} onChange={(e) => set("visitTime", e.target.value)} required className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Auditor *</label>
              <input type="text" readOnly value={currentUser.name || audit.finalAuditor} className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-low text-on-surface-variant cursor-not-allowed" />
              <p className="font-label-md text-on-surface-variant/50 mt-1 text-[10px]">Auto-filled</p>
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Severity of Findings *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["open_for_improvement", "non_conformance"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("severity", s)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${form.severity === s ? (s === "non_conformance" ? "border-error bg-error/5" : "border-primary bg-primary/5") : "border-outline-variant hover:border-on-surface-variant/30 hover:bg-surface-container-lowest"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`material-symbols-outlined text-[24px] ${form.severity === s ? (s === "non_conformance" ? "text-error" : "text-primary") : "text-on-surface-variant/50"}`}>
                      {s === "non_conformance" ? "error_outline" : "info"}
                    </span>
                    <span className={`font-label-md font-bold ${form.severity === s ? (s === "non_conformance" ? "text-error" : "text-primary") : "text-on-surface-variant"}`}>
                      {s === "non_conformance" ? "Non-Conformance" : "Open for Improvement"}
                    </span>
                    {form.severity === s && <span className="material-symbols-outlined text-[18px] ml-auto text-secondary filled">check_circle</span>}
                  </div>
                  <p className="font-label-md text-on-surface-variant/70">
                    {s === "non_conformance" ? "A critical deficiency that requires immediate corrective action." : "An opportunity to improve processes or systems."}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Findings *</label>
            <textarea
              value={form.findings}
              onChange={(e) => set("findings", e.target.value)}
              rows={5}
              required
              placeholder="Describe the audit findings in detail..."
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
            />
            <p className="font-label-md text-on-surface-variant/50 mt-1">{form.findings.length} characters</p>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Proof / Evidence</label>
            <div
              className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-surface-container-lowest transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant/30 group-hover:text-primary transition-colors">cloud_upload</span>
              <p className="font-body-md font-semibold text-on-surface">Click to upload evidence</p>
              <p className="font-label-md text-on-surface-variant/60">Images, PDF, video (Max 10MB each)</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.mp4,.mov,.docx" className="hidden" onChange={handleFileChange} />
            </div>
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-secondary/5 border border-secondary/20 rounded-lg">
                    <span className="material-symbols-outlined text-secondary text-[16px]">attach_file</span>
                    <span className="font-label-md text-secondary">{f}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="material-symbols-outlined text-[14px] text-on-surface-variant/50 hover:text-error ml-1">close</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
            <input
              type="checkbox"
              id="checklist"
              checked={form.hasChecklist}
              onChange={(e) => set("hasChecklist", e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <label htmlFor="checklist" className="flex-1 cursor-pointer">
              <p className="font-label-md font-semibold text-on-surface">Upload Audit Report Checklist</p>
              <p className="font-label-md text-on-surface-variant/60 text-[11px]">(Optional) Attach the completed checklist for this audit</p>
            </label>
          </div>
        </div>

        <div className="p-6 pt-0 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-3">
          <button type="button" onClick={() => navigate("/scheduled-audits")} className="px-6 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container transition-colors">Cancel</button>
          <button
            type="submit"
            disabled={submitting || !form.severity || !form.findings.trim()}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                Submit Report
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
