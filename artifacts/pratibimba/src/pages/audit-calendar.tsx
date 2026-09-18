import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useApp, PRAKALPAS } from "../context/app-context";
import { getAuditPlans } from "../services/auditPlanService";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function normalizeDate(date: any) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

interface CalendarEvent {
  date: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation?: string;
  status: string;
  coordinator: string;
  auditors: string[];
  color: string;
}

export default function AuditCalendarPage() {
  const { currentUser } = useApp();
  const [auditPlans, setAuditPlans] = useState<any[]>([]);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [view, setView] = useState<"month" | "list">("month");

  useEffect(() => {
    loadData();

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        loadData();
      }
    };

    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const loadData = async () => {
    try {
      const plans = await getAuditPlans();
      const planData = Array.isArray(plans)
        ? plans
        : Array.isArray(plans?.data)
        ? plans.data
        : [];
      setAuditPlans(planData);
    } catch (err) {
      console.error("Error loading audit plans for calendar:", err);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  // Convert each Audit Plan into exactly ONE calendar event
  const events = useMemo(() => {
    const evs: CalendarEvent[] = [];

    for (const p of auditPlans || []) {
      if (filterPrakalpa !== "All" && p.prakalpa !== filterPrakalpa) continue;

      const normDate = normalizeDate(p.auditPlannedDate);
      if (!normDate) continue;

      const isScheduled = p.status === "scheduled";
      const color = isScheduled
        ? "bg-blue-600 text-white"
        : "bg-amber-500 text-white";

      evs.push({
        date: normDate,
        iqaNumber: p.iqaNumber,
        prakalpa: p.prakalpa,
        location: p.location,
        sublocation: p.sublocation || "",
        status: p.status || "pending",
        coordinator: p.auditCoordinator || "",
        auditors: p.auditors || [],
        color,
      });
    }

    return evs;
  }, [auditPlans, filterPrakalpa]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const eventsForDay = (day: number) => {
    const dateStr = normalizeDate(new Date(viewYear, viewMonth, day));
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDateStr =
    selectedDay != null
      ? normalizeDate(new Date(viewYear, viewMonth, selectedDay))
      : null;
  const selectedEvents = selectedDateStr
    ? events.filter((e) => e.date === selectedDateStr)
    : [];

  // Upcoming list (all future events starting from today)
  const upcomingList = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return (auditPlans || [])
      .map((p) => ({
        date: normalizeDate(p.auditPlannedDate),
        iqaNumber: p.iqaNumber,
        prakalpa: p.prakalpa,
        location: p.location,
        sublocation: p.sublocation || "",
        status: p.status || "pending",
        coordinator: p.auditCoordinator || "",
        auditors: p.auditors || [],
      }))
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d >= startOfToday;
      })
      .filter((e) => filterPrakalpa === "All" || e.prakalpa === filterPrakalpa)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [auditPlans, filterPrakalpa]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Calendar</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {events.length} audit events
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/audit-plan"
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              event_note
            </span>
            List View
          </Link>
          <select
            value={filterPrakalpa}
            onChange={(e) => setFilterPrakalpa(e.target.value)}
            className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Prakalpas</option>
            {PRAKALPAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <div className="flex rounded-lg overflow-hidden border border-outline-variant/40">
            <button
              onClick={() => setView("month")}
              className={`px-4 py-2 font-label-md transition-colors ${
                view === "month"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 font-label-md transition-colors ${
                view === "list"
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-x-auto min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-4 border-b border-outline-variant/10">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <h3 className="font-headline-sm">
                {MONTHS[viewMonth]} {viewYear}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">
                  chevron_right
                </span>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-outline-variant/10 min-w-[560px]">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center font-label-md text-on-surface-variant/60 text-[11px] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 min-w-[560px]">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="h-20 border-b border-r border-outline-variant/10 bg-surface-container-lowest/40"
                />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                const isToday =
                  day === today.getDate() &&
                  viewMonth === today.getMonth() &&
                  viewYear === today.getFullYear();
                const isSelected = day === selectedDay;
                const hasEvents = dayEvents.length > 0;
                return (
                  <div
                    key={day}
                    onClick={() =>
                      setSelectedDay(day === selectedDay ? null : day)
                    }
                    className={`h-20 border-b border-r border-outline-variant/10 p-1.5 cursor-pointer transition-colors relative ${
                      isSelected
                        ? "bg-blue-50 ring-2 ring-blue-500"
                        : "hover:bg-surface-container-low"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-label-md ${
                        isToday
                          ? "bg-red-600 text-white font-bold"
                          : "text-on-surface"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <div
                          key={j}
                          className={`text-[9px] px-1 py-0.5 rounded font-bold truncate text-center leading-tight ${ev.color}`}
                        >
                          {ev.iqaNumber}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-on-surface-variant/60 px-1 text-center">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                    {hasEvents && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((ev, j) => (
                          <div
                            key={j}
                            className={`w-1.5 h-1.5 rounded-full ${
                              ev.status === "scheduled"
                                ? "bg-blue-600"
                                : "bg-amber-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-outline-variant/10 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-label-md text-on-surface-variant/70 text-[11px]">
                  Pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="font-label-md text-on-surface-variant/70 text-[11px]">
                  Scheduled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                <span className="font-label-md text-on-surface-variant/70 text-[11px]">
                  Today
                </span>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {selectedDay && selectedEvents.length > 0 ? (
              <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10 bg-blue-50">
                  <h4 className="font-headline-sm">
                    {selectedDay} {MONTHS[viewMonth]}
                  </h4>
                  <p className="font-label-md text-on-surface-variant/70">
                    {selectedEvents.length} event
                    {selectedEvents.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {selectedEvents.map((ev, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            ev.status === "scheduled"
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="font-label-md text-on-surface-variant/70 text-[11px] uppercase">
                          {ev.status}
                        </span>
                      </div>
                      <p className="font-data-mono text-[12px] text-blue-600 font-bold">
                        {ev.iqaNumber}
                      </p>
                      <p className="font-body-md text-on-surface mt-0.5">
                        {ev.prakalpa} — {ev.location}
                        {ev.sublocation ? `, ${ev.sublocation}` : ""}
                      </p>
                      {ev.coordinator && (
                        <p className="font-label-md text-on-surface-variant/70 text-[11px] mt-1">
                          Coordinator: {ev.coordinator}
                        </p>
                      )}
                      {ev.auditors.length > 0 && (
                        <p className="font-label-md text-on-surface-variant/70 text-[11px] mt-0.5">
                          Auditors: {ev.auditors.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedDay ? (
              <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-6 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20">
                  event_busy
                </span>
                <p className="font-body-md text-on-surface-variant/50 mt-2">
                  No events on {selectedDay} {MONTHS[viewMonth]}
                </p>
              </div>
            ) : null}

            {/* Upcoming Section */}
            <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/10">
                <h4 className="font-headline-sm text-[16px]">
                  Upcoming Audits
                </h4>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
                {upcomingList.slice(0, 8).length === 0 ? (
                  <p className="p-4 font-body-md text-on-surface-variant/50">
                    No upcoming events
                  </p>
                ) : (
                  upcomingList.slice(0, 8).map((ev, i) => (
                    <div key={i} className="p-3 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                          ev.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        <span className="font-data-mono font-bold text-[11px] leading-none">
                          {ev.date ? new Date(ev.date).getDate() : "—"}
                        </span>
                        <span className="font-label-md text-[9px] uppercase">
                          {ev.date
                            ? MONTHS[new Date(ev.date).getMonth()].slice(0, 3)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-data-mono text-[11px] font-bold text-blue-600 truncate">
                          {ev.iqaNumber}
                        </p>
                        <p className="font-label-md text-on-surface-variant/70 text-[11px] truncate">
                          {ev.prakalpa} — {ev.location}
                        </p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          ev.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {[
                    "Date",
                    "Audit ID",
                    "Prakalpa",
                    "Location",
                    "Sublocation",
                    "Coordinator",
                    "Auditors",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {(auditPlans || [])
                  .filter(
                    (p) =>
                      filterPrakalpa === "All" || p.prakalpa === filterPrakalpa
                  )
                  .map((p) => ({
                    date: normalizeDate(p.auditPlannedDate),
                    iqaNumber: p.iqaNumber,
                    prakalpa: p.prakalpa,
                    location: p.location,
                    sublocation: p.sublocation || "—",
                    coordinator: p.auditCoordinator || "—",
                    auditors: p.auditors || [],
                    status: p.status || "pending",
                  }))
                  .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                  .map((ev, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-surface-container-low ${
                        idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-data-mono text-[12px] text-on-surface-variant whitespace-nowrap">
                        {ev.date
                          ? new Date(ev.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-data-mono text-[12px] text-blue-600 font-bold">
                        {ev.iqaNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold whitespace-nowrap">
                          {ev.prakalpa}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">
                        {ev.location}
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">
                        {ev.sublocation}
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">
                        {ev.coordinator}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(ev.auditors || []).map((a: string) => (
                            <span
                              key={a}
                              className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] whitespace-nowrap"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                            ev.status === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}