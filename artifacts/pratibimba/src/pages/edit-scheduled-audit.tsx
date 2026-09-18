import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";

import {
  useApp,
  AUDIT_COORDINATORS,
  type ScheduledAudit,
} from "../context/app-context";

import {
  getScheduledAuditById,
  updateScheduledAudit,
} from "../services/scheduledAuditService";

import {
  updateAuditPlan,
} from "../services/auditPlanService";

function toInputDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date
    .toISOString()
    .split("T")[0];
}

export default function EditScheduledAuditPage() {
  const [, params] =
    useRoute(
      "/scheduled-audits/:id/edit"
    );

  const [, navigate] =
    useLocation();

  const {
    auditors,
  } = useApp();

  const id =
    params?.id || "";

  const [
    audit,
    setAudit,
  ] =
    useState<ScheduledAudit | null>(
      null
    );

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [
    coordinator,
    setCoordinator,
  ] = useState("");

  const [
    selectedAuditors,
    setSelectedAuditors,
  ] = useState<string[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

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
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getScheduledAuditById(
            id
          );

        setAudit(data);

        setStartDate(
          toInputDate(
            data.startDate
          )
        );

        setEndDate(
          toInputDate(
            data.endDate
          )
        );

        setCoordinator(
          data.auditCoordinator ||
            ""
        );

        setSelectedAuditors(
          data.auditors || []
        );
      } catch (err: any) {
        setError(
          err?.response?.data
            ?.message ||
            "Failed to load Scheduled Audit."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  const toggleAuditor = (
    name: string
  ) => {
    setSelectedAuditors(
      (current) =>
        current.includes(name)
          ? current.filter(
              (a) =>
                a !== name
            )
          : [
              ...current,
              name,
            ]
    );
  };

  const handleSave =
    async () => {
      if (!audit) return;

      setError("");
      setSuccess("");

      if (
        audit.status ===
        "completed"
      ) {
        setError(
          "Completed audits cannot be edited."
        );
        return;
      }

      if (
        !startDate ||
        !endDate
      ) {
        setError(
          "Start Date and End Date are required."
        );
        return;
      }

      if (
        new Date(endDate) <
        new Date(startDate)
      ) {
        setError(
          "End Date cannot be before Start Date."
        );
        return;
      }

      if (
        !coordinator.trim()
      ) {
        setError(
          "Audit Coordinator is required."
        );
        return;
      }

      if (!audit.auditPlan) {
        setError(
          "The linked Audit Plan is missing."
        );
        return;
      }

      try {
        setSaving(true);

        /*
         * Master planning fields update through AuditPlan.
         */
        await updateAuditPlan(
          audit.auditPlan,
          {
            auditPlannedDate:
              startDate,

            auditCoordinator:
              coordinator,

            auditors:
              selectedAuditors,
          }
        );

        /*
         * Scheduled execution-specific End Date
         * updates ScheduledAudit.
         */
        await updateScheduledAudit(
          id,
          {
            endDate,
          }
        );

        setSuccess(
          "Scheduled Audit updated successfully."
        );

        setTimeout(() => {
          navigate(
            "/scheduled-audits"
          );
        }, 700);
      } catch (err: any) {
        console.error(
          "Scheduled Audit update failed:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Failed to update Scheduled Audit."
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">

        <div className="text-center">

          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />

          <p className="mt-3 text-sm text-on-surface-variant">
            Loading audit...
          </p>

        </div>

      </div>
    );
  }

  if (
    !audit ||
    error &&
      !audit
  ) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">

        <div className="max-w-xl mx-auto bg-white rounded-xl border border-red-200 p-6">

          <p className="text-red-700">
            {error ||
              "Scheduled Audit not found."}
          </p>

          <button
            onClick={() =>
              navigate(
                "/scheduled-audits"
              )
            }
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Back to Scheduled Audits
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 min-w-0">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-xs uppercase tracking-wider text-primary font-bold">
            Scheduled Audit
          </p>

          <h1 className="font-headline-md text-on-surface mt-1">
            Edit Audit
          </h1>

          <p className="font-data-mono text-sm text-primary mt-1">
            {audit.iqaNumber}
          </p>

        </div>

        <button
          onClick={() =>
            navigate(
              "/scheduled-audits"
            )
          }
          className="px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold"
        >
          Back
        </button>

      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-outline-variant/20 overflow-hidden">

        <div className="p-6 border-b border-outline-variant/10">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>

              <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
                Prakalpa
              </p>

              <p className="mt-1 font-semibold">
                {audit.prakalpa}
              </p>

            </div>

            <div>

              <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
                Location
              </p>

              <p className="mt-1 font-semibold">
                {audit.location}

                {audit.sublocation
                  ? ` — ${audit.sublocation}`
                  : ""}
              </p>

            </div>

            <div>

              <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
                Pramukh
              </p>

              <p className="mt-1 font-semibold">
                {audit.prakalphaPramukh ||
                  "—"}
              </p>

            </div>

            <div>

              <p className="text-[10px] uppercase tracking-wide font-bold text-on-surface-variant">
                Current Status
              </p>

              <p className="mt-1 font-semibold capitalize">
                {audit.status ||
                  "upcoming"}
              </p>

            </div>

          </div>

        </div>

        <div className="p-6 space-y-6">

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div>

              <label className="font-label-md block mb-1 text-on-surface-variant">
                Start Date
              </label>

              <input
                type="date"
                value={
                  startDate
                }
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                disabled={
                  saving
                }
                className="w-full border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary/20 outline-none"
              />

            </div>

            <div>

              <label className="font-label-md block mb-1 text-on-surface-variant">
                End Date
              </label>

              <input
                type="date"
                value={
                  endDate
                }
                min={
                  startDate
                }
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                disabled={
                  saving
                }
                className="w-full border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary/20 outline-none"
              />

            </div>

          </div>

          <div>

            <label className="font-label-md block mb-1 text-on-surface-variant">
              Audit Coordinator
            </label>

            <select
              value={
                coordinator
              }
              onChange={(e) =>
                setCoordinator(
                  e.target.value
                )
              }
              disabled={
                saving
              }
              className="w-full border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary/20 outline-none"
            >

              <option value="">
                Select Coordinator
              </option>

              {coordinator &&
                !AUDIT_COORDINATORS.includes(
                  coordinator
                ) && (
                  <option
                    value={
                      coordinator
                    }
                  >
                    {coordinator}
                  </option>
                )}

              {AUDIT_COORDINATORS.map(
                (name) => (
                  <option
                    key={
                      name
                    }
                    value={
                      name
                    }
                  >
                    {name}
                  </option>
                )
              )}

            </select>

          </div>

          <div>

            <label className="font-label-md block mb-2 text-on-surface-variant">
              Auditors
            </label>

            <div className="flex flex-wrap gap-2">

              {auditors.map(
                (name) => (
                  <button
                    key={
                      name
                    }
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      toggleAuditor(
                        name
                      )
                    }
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedAuditors.includes(
                        name
                      )
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-on-surface-variant border-outline-variant"
                    }`}
                  >
                    {name}
                  </button>
                )
              )}

            </div>

          </div>

          <div>

            <p className="font-label-md block mb-2 text-on-surface-variant">
              Audit Areas
            </p>

            <div className="flex flex-wrap gap-2">

              {(audit.auditAreas ||
                []).length >
              0 ? (
                audit.auditAreas?.map(
                  (area) => (
                    <span
                      key={
                        area
                      }
                      className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs"
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

        </div>

        <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/scheduled-audits"
              )
            }
            disabled={
              saving
            }
            className="px-5 py-2.5 border border-outline-variant rounded-lg font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              handleSave
            }
            disabled={
              saving
            }
            className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

        </div>

      </div>

    </div>
  );
}
