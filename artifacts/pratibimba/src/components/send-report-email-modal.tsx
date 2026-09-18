import { useEffect, useState } from "react";
import { PRAKALPA_PRAMUKH_DETAILS } from "../context/app-context";
import { sendReportEmail } from "../services/reportService";

export interface MailableReport {
  _id: string;
  iqrNumber: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation?: string;
  auditCoordinator?: string;
  auditors?: string[];
  visitDate?: string;
  severity: "non_conformance" | "open_for_improvement";
  findings?: string;
}

interface Props {
  report: MailableReport | null;
  onClose: () => void;
  onSent: () => void;
}

function buildDraft(report: MailableReport) {
  const classification =
    report.severity === "non_conformance"
      ? "Non-Conformance"
      : "Open for Improvement";

  const visitDate = report.visitDate
    ? new Date(report.visitDate).toLocaleDateString("en-IN")
    : "—";

  const auditors = (report.auditors || []).join(", ") || "—";

  const subject = `Audit Report ${report.iqrNumber} — ${report.prakalpa}, ${report.location}`;

  const message = [
    "Dear Sir/Madam,",
    "",
    "Please find attached the Internal Quality Audit report for your reference.",
    "",
    `IQR Number: ${report.iqrNumber}`,
    `IQA Reference: ${report.iqaNumber}`,
    `Prakalpa: ${report.prakalpa}`,
    `Location: ${report.location}${report.sublocation ? ` (${report.sublocation})` : ""}`,
    `Audit Coordinator: ${report.auditCoordinator || "—"}`,
    `Auditor(s): ${auditors}`,
    `Visit Date: ${visitDate}`,
    `Classification: ${classification}`,
    "",
    "Finding:",
    report.findings || "—",
    "",
    "Kindly review the attached report and take necessary action within the stipulated timeline.",
    "",
    "Regards,",
    "Pratibimba Audit Management System",
  ].join("\n");

  return { subject, message };
}

function splitEmails(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function SendReportEmailModal({ report, onClose, onSent }: Props) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Re-prefill every time a new report is opened in the modal.
  useEffect(() => {
    if (!report) return;

    const details = PRAKALPA_PRAMUKH_DETAILS[report.prakalpa];
    const draft = buildDraft(report);

    setTo(details?.praMukhEmail || "");
    setCc(details?.seniorEmail || "");
    setSubject(draft.subject);
    setMessage(draft.message);
    setError("");
    setSending(false);
    setSent(false);
  }, [report]);

  if (!report) return null;

  const handleSend = async () => {
    const toList = splitEmails(to);

    if (toList.length === 0) {
      setError("Please enter at least one recipient email address.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await sendReportEmail(report._id, {
        to: toList,
        cc: splitEmails(cc),
        subject,
        message,
      });
      setSent(true);
      onSent();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to send email. Check the server's email configuration and try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-floating border border-outline-variant/20 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-headline-sm font-bold text-on-surface">
              Send Report Email
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {report.iqrNumber} · {report.prakalpa}, {report.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <span className="material-symbols-outlined text-[40px] text-primary">
                mark_email_read
              </span>
              <p className="font-bold text-on-surface">Email sent</p>
              <p className="text-xs text-on-surface-variant">
                The report was emailed to {to}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  To
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="name@example.org, name2@example.org"
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Cc{" "}
                  <span className="font-normal text-on-surface-variant/60">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="name@example.org"
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={10}
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs font-body-md resize-none focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant bg-surface-container-low rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  attach_file
                </span>
                {report.iqrNumber}.pdf will be generated and attached automatically.
              </div>
              {error && (
                <p className="text-[11px] text-error bg-error/5 border border-error/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant/10 flex justify-end gap-2 shrink-0">
          {sent ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:brightness-110"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-black/5 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send Email"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
