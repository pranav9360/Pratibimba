import {
  useEffect,
  useState,
} from "react";

import {
  updateScheduledAudit,
} from "../services/scheduledAuditService";

import {
  useApp,
} from "../context/app-context";

interface ScheduledAudit {
  _id: string;
  auditPlan?: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation?: string;
  startDate?: string;
  endDate?: string;
  auditCoordinator?: string;
  auditors?: string[];
  status?: string;
}

interface Props {
  audit: ScheduledAudit;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

function toDateInputValue(
  value?: string
) {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .split("T")[0];
}

export default function EditScheduledAuditModal({
  audit,
  onClose,
  onUpdated,
}: Props) {
  const {
    auditorUsers,
    coordinatorUsers,
  } = useApp();

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    auditCoordinator,
    setAuditCoordinator,
  ] = useState("");

  const [
    auditors,
    setAuditors,
  ] = useState<string[]>([]);

  const [
    status,
    setStatus,
  ] = useState(
    "upcoming"
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  useEffect(() => {
    setStartDate(
      toDateInputValue(
        audit.startDate
      )
    );

    setEndDate(
      toDateInputValue(
        audit.endDate
      )
    );

    setAuditCoordinator(
      audit.auditCoordinator || ""
    );

    setAuditors(
      audit.auditors || []
    );

    setStatus(
      audit.status || "upcoming"
    );
  }, [audit]);

  const toggleAuditor = (
    name: string
  ) => {
    setAuditors((current) =>
      current.includes(name)
        ? current.filter(
            (item) =>
              item !== name
          )
        : [...current, name]
    );
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (
      !startDate ||
      !endDate
    ) {
      setError(
        "Start date and end date are required."
      );
      return;
    }

    if (
      new Date(endDate) <
      new Date(startDate)
    ) {
      setError(
        "End date cannot be earlier than start date."
      );
      return;
    }

    if (
      !auditCoordinator.trim()
    ) {
      setError(
        "Please select an audit coordinator."
      );
      return;
    }

    try {
      setSaving(true);

      await updateScheduledAudit(
        audit._id,
        {
          startDate,
          endDate,
          auditCoordinator,
          auditors,
          status,
        }
      );

      setSuccess(
        "Scheduled audit updated successfully."
      );

      await onUpdated();

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Failed to update scheduled audit."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-outline-variant/20">

        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">

          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Edit Scheduled Audit
            </h2>

            <p className="text-xs text-on-surface-variant mt-1">
              {audit.iqaNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              close
            </span>
          </button>

        </div>

        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container/40 rounded-xl p-4">

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Prakalpa
              </p>

              <p className="text-sm font-semibold text-on-surface mt-1">
                {audit.prakalpa ||
                  audit.prakalpa ||
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                Location
              </p>

              <p className="text-sm font-semibold text-on-surface mt-1">
                {audit.location ||
                  "—"}

                {audit.sublocation
                  ? ` — ${audit.sublocation}`
                  : ""}
              </p>
            </div>

          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-2">

              <label className="text-sm font-semibold text-on-surface">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

            </div>

            <div className="space-y-2">

              <label className="text-sm font-semibold text-on-surface">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                min={
                  startDate ||
                  undefined
                }
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />

            </div>

          </div>

          <div className="space-y-2">

            <label className="text-sm font-semibold text-on-surface">
              Audit Coordinator
            </label>

            <select
              value={
                auditCoordinator
              }
              onChange={(e) =>
                setAuditCoordinator(
                  e.target.value
                )
              }
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >

              <option value="">
                Select coordinator
              </option>

              {auditCoordinator &&
                !coordinatorUsers.some(
                  (user) =>
                    user.name ===
                    auditCoordinator
                ) && (
                  <option
                    value={
                      auditCoordinator
                    }
                  >
                    {auditCoordinator}
                  </option>
                )}

              {coordinatorUsers.map(
                (user) => (
                  <option
                    key={user.id}
                    value={user.name}
                  >
                    {user.name}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="space-y-3">

            <div>
              <label className="text-sm font-semibold text-on-surface">
                Auditors
              </label>

              <p className="text-xs text-on-surface-variant mt-1">
                Select one or more auditors for this audit.
              </p>
            </div>

            <div className="border border-outline-variant/20 rounded-xl divide-y divide-outline-variant/10 max-h-52 overflow-y-auto">

              {auditorUsers.length ===
              0 ? (
                <div className="p-4 text-xs text-on-surface-variant">
                  No active auditors available.
                </div>
              ) : (
                auditorUsers.map(
                  (user) => {
                    const checked =
                      auditors.includes(
                        user.name
                      );

                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container/30 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggleAuditor(
                              user.name
                            )
                          }
                          className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                        />

                        <div className="flex-1 min-w-0">

                          <p className="text-sm font-medium text-on-surface">
                            {user.name}
                          </p>

                          <p className="text-[11px] text-on-surface-variant truncate">
                            {user.email}
                          </p>

                        </div>

                      </label>
                    );
                  }
                )
              )}

            </div>

            {auditors.length >
              0 && (
              <div className="flex flex-wrap gap-2">

                {auditors.map(
                  (name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                    >
                      {name}

                      <button
                        type="button"
                        onClick={() =>
                          toggleAuditor(
                            name
                          )
                        }
                      >
                        ×
                      </button>

                    </span>
                  )
                )}

              </div>
            )}

          </div>

          <div className="space-y-2">

            <label className="text-sm font-semibold text-on-surface">
              Audit Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="upcoming">
                Upcoming
              </option>

              <option value="ongoing">
                Ongoing
              </option>

              <option value="completed">
                Completed
              </option>
            </select>

          </div>

        </div>

        <div className="sticky bottom-0 bg-white border-t border-outline-variant/20 px-6 py-4 flex justify-end gap-3">

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  save
                </span>
                Save Changes
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
}
