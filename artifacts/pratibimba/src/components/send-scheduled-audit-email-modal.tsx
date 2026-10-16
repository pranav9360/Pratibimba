import {
  useEffect,
  useState,
} from "react";

import {
  PRAKALPA_PRAMUKH_DETAILS,
} from "../context/app-context";

import api from "../services/api";

import { sendIQAReportsEmail } from "../services/reportService";
export interface MailableScheduledAudit {
  _id?: string;
  id?: string;

  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation?: string;

  startDate?: string;
  endDate?: string;

  auditCoordinator?: string;
}

interface EmailAttachmentPreview {
  name: string;
  reportId?: string;
}

interface Props {
  audit: MailableScheduledAudit | null;
  onClose: () => void;
  onSent: () => void | Promise<void>;

  // Optional overrides used by IQA Report email flow.
  mode?: "scheduled-audit" | "iqa-report";
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialMessage?: string;
  attachments?: EmailAttachmentPreview[];
}

function splitEmails(
  value: string
): string[] {
  return value
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function formatDate(
  value?: string
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function SendScheduledAuditEmailModal({
  audit,
  onClose,
  onSent,
  mode = "scheduled-audit",
  initialTo,
  initialCc,
  initialSubject,
  initialMessage,
  attachments = [],
}: Props) {
  const [to, setTo] =
    useState("");

  const [cc, setCc] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [sent, setSent] =
    useState(false);

  useEffect(() => {
    if (!audit) return;

    const details =
      PRAKALPA_PRAMUKH_DETAILS[
        audit.prakalpa
      ];

    const startDate =
      formatDate(
        audit.startDate
      );

    const endDate =
      formatDate(
        audit.endDate
      );

    setTo(
      initialTo !== undefined
        ? initialTo
        : details?.praMukhEmail || ""
    );

    setCc(
      initialCc !== undefined
        ? initialCc
        : details?.seniorEmail || ""
    );

    setSubject(
      initialSubject !== undefined
        ? initialSubject
        : `Upcoming Internal Quality Audit: ${audit.iqaNumber} — ${audit.prakalpa}`
    );

    setMessage(
      initialMessage !== undefined
        ? initialMessage
        : [
        "Dear Coordinator / Team,",
        "",
        "This is a notification regarding the upcoming scheduled internal quality audit.",
        "",
        `IQA Reference: ${audit.iqaNumber}`,
        `Prakalpa: ${audit.prakalpa}`,
        `Location: ${audit.location}`,
        `Start Date: ${startDate}`,
        `End Date: ${endDate}`,
        `Audit Coordinator: ${audit.auditCoordinator || "—"}`,
        "",
        "Kindly ensure necessary preparations are in order.",
        "",
        "Regards,",
        "Pratibimba Audit Management System",
      ].join("\n")
    );

    setError("");
    setSending(false);
    setSent(false);
  }, [
    audit,
    initialTo,
    initialCc,
    initialSubject,
    initialMessage,
  ]);

  if (!audit) {
    return null;
  }

  const auditId =
    audit._id ||
    audit.id;

  const handleSend =
    async () => {
      if (!auditId) {
        setError(
          "Scheduled Audit ID is missing."
        );
        return;
      }

      const toList =
        splitEmails(to);

      if (
        toList.length === 0
      ) {
        setError(
          "Please enter at least one recipient email address."
        );
        return;
      }

      setSending(true);
      setError("");

      try {
        if (mode === "iqa-report") {
          // Open Reports:
          // send ALL IQR PDFs belonging to this IQA.
          await sendIQAReportsEmail(
            audit.iqaNumber,
            {
              to: toList,
              cc: splitEmails(cc),
              subject,
              message,
              reportIds: attachments
                .map((attachment) => attachment.reportId)
                .filter((id): id is string => Boolean(id)),
            }
          );
        } else {
          // Scheduled Audits:
          // notification email only — NO attachments.
          await api.post(
            `/scheduled-audits/${auditId}/send-email`,
            {
              to: toList,
              cc: splitEmails(cc),
              subject,
              message,
            }
          );
        }

        setSent(true);

        await onSent();
      } catch (err: any) {
        setError(
          err?.response?.data
            ?.message ||
            "Failed to send email. SMTP configuration can be completed later."
        );
      } finally {
        setSending(false);
      }
    };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >

      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-floating border border-outline-variant/20 flex flex-col max-h-[90vh]"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between shrink-0">

          <div>

            <h3 className="font-headline-sm font-bold text-on-surface">
              {mode === "iqa-report"
                ? "Send IQA Report Email"
                : "Send Audit Notification Email"}
            </h3>

            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {audit.iqaNumber} ·{" "}
              {audit.prakalpa},{" "}
              {audit.location}
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">
              close
            </span>
          </button>

        </div>

        <div className="p-5 space-y-3 overflow-y-auto">

          {sent ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">

              <span className="material-symbols-outlined text-[40px] text-primary">
                mark_email_read
              </span>

              <p className="font-bold text-on-surface">
                Email sent
              </p>

              <p className="text-xs text-on-surface-variant">
                The notification was emailed to {to}.
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
                  onChange={(e) =>
                    setTo(
                      e.target.value
                    )
                  }
                  placeholder="name@example.org"
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
                  onChange={(e) =>
                    setCc(
                      e.target.value
                    )
                  }
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
                  onChange={(e) =>
                    setSubject(
                      e.target.value
                    )
                  }
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs focus:outline-none focus:border-primary"
                />

              </div>

              <div>

                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Message
                </label>

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  rows={11}
                  className="w-full p-2 border border-outline-variant/30 rounded-lg text-xs font-body-md resize-none focus:outline-none focus:border-primary"
                />

              </div>

              {mode === "iqa-report" && attachments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    Attachments
                  </label>

                  <div className="space-y-1.5">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.name}
                        className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          picture_as_pdf
                        </span>

                        <span className="text-xs font-medium text-on-surface">
                          {attachment.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-on-surface-variant mt-1.5">
                    These report PDFs will be generated from the stored IQR data when the email is sent.
                  </p>
                </div>
              )}

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
                onClick={
                  handleSend
                }
                disabled={sending}
                className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-60"
              >
                {sending
                  ? "Sending…"
                  : "Send Email"}
              </button>

            </>
          )}

        </div>

      </div>

    </div>
  );
}
