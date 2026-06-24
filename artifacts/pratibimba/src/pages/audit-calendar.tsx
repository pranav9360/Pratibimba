import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, DOMAINS } from "../context/app-context";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function AuditCalendarPage() {
  const { auditPlans, scheduledAudits, currentUser } = useApp();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterDomain, setFilterDomain] = useState("All");
  const [view, setView] = useState<"month" | "list">("month");

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelectedDay(null);
  };

  // Combine plans + scheduled into calendar events
  const events = useMemo(() => {
    const evs: { date: string; type: "plan" | "scheduled" | "scheduled_end"; label: string; domain: string; iqaNumber: string; color: string }[] = [];
    for (const p of auditPlans) {
      if (filterDomain !== "All" && p.domain !== filterDomain) continue;
      evs.push({ date: p.auditPlannedDate, type: "plan", label: `${p.iqaNumber} — ${p.domain}${p.sublocation ? ` (${p.sublocation})` : ""}`, domain: p.domain, iqaNumber: p.iqaNumber, color: "bg-secondary text-on-secondary" });
    }
    for (const s of scheduledAudits) {
      if (filterDomain !== "All" && s.domain !== filterDomain) continue;
      evs.push({ date: s.startDate, type: "scheduled", label: `${s.iqaNumber} — ${s.domain}${s.sublocation ? ` (${s.sublocation})` : ""} [Start]`, domain: s.domain, iqaNumber: s.iqaNumber, color: "bg-primary text-on-primary" });
      evs.push({ date: s.endDate, type: "scheduled_end", label: `${s.iqaNumber} — ${s.domain} [End]`, domain: s.domain, iqaNumber: s.iqaNumber, color: "bg-primary/40 text-on-primary" });
    }
    return evs;
  }, [auditPlans, scheduledAudits, filterDomain]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const eventsForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDateStr = selectedDay != null ? `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` : null;
  const selectedEvents = selectedDateStr ? events.filter((e) => e.date === selectedDateStr) : [];

  // Upcoming list (next 90 days)
  const upcomingList = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 90);
    return [...auditPlans.map((p) => ({
      date: p.auditPlannedDate, label: `${p.domain} — ${p.location}${p.sublocation ? `, ${p.sublocation}` : ""}`, iqaNumber: p.iqaNumber, type: "plan" as const, auditors: p.auditors, coordinator: p.auditCoordinator
    })), ...scheduledAudits.map((s) => ({
      date: s.startDate, label: `${s.domain} — ${s.location}${s.sublocation ? `, ${s.sublocation}` : ""}`, iqaNumber: s.iqaNumber, type: "scheduled" as const, auditors: s.auditors, coordinator: s.auditCoordinator
    }))]
      .filter((e) => { const d = new Date(e.date); return d >= new Date() && d <= cutoff; })
      .filter((e) => filterDomain === "All" || e.label.startsWith(filterDomain))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [auditPlans, scheduledAudits, filterDomain]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Calendar</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{events.filter((e) => e.type !== "scheduled_end").length} audit events</p>
        </div>
        <div className="flex gap-3">
          <Link href="/audit-plan" className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px]">event_note</span>
            List View
          </Link>
          <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Domains</option>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden border border-outline-variant/40">
            <button onClick={() => setView("month")} className={`px-4 py-2 font-label-md transition-colors ${view === "month" ? "bg-primary text-on-primary" : "bg-white text-on-surface-variant hover:bg-surface-container-low"}`}>Month</button>
            <button onClick={() => setView("list")} className={`px-4 py-2 font-label-md transition-colors ${view === "list" ? "bg-primary text-on-primary" : "bg-white text-on-surface-variant hover:bg-surface-container-low"}`}>List</button>
          </div>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <h3 className="font-headline-sm">{MONTHS[viewMonth]} {viewYear}</h3>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-outline-variant/10">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center font-label-md text-on-surface-variant/60 text-[11px] uppercase tracking-wider">{d}</div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 border-b border-r border-outline-variant/10 bg-surface-container-lowest/40" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = day === selectedDay;
                const hasEvents = dayEvents.length > 0;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    className={`h-20 border-b border-r border-outline-variant/10 p-1.5 cursor-pointer transition-colors relative ${isSelected ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-surface-container-low"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-label-md ${isToday ? "bg-primary text-on-primary font-bold" : "text-on-surface"}`}>
                      {day}
                    </div>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <div key={j} className={`text-[9px] px-1 py-0.5 rounded font-bold truncate leading-tight ${ev.color}`}>
                          {ev.iqaNumber}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-on-surface-variant/60 px-1">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                    {hasEvents && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((ev, j) => (
                          <div key={j} className={`w-1 h-1 rounded-full ${ev.type === "plan" ? "bg-secondary" : "bg-primary"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-outline-variant/10 flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary" /><span className="font-label-md text-on-surface-variant/70 text-[11px]">Planned</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="font-label-md text-on-surface-variant/70 text-[11px]">Scheduled</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-error" /><span className="font-label-md text-on-surface-variant/70 text-[11px]">Today</span></div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {selectedDay && selectedEvents.length > 0 ? (
              <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10 bg-primary/5">
                  <h4 className="font-headline-sm">{selectedDay} {MONTHS[viewMonth]}</h4>
                  <p className="font-label-md text-on-surface-variant/70">{selectedEvents.length} event{selectedEvents.length > 1 ? "s" : ""}</p>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {selectedEvents.map((ev, i) => (
                    <div key={i} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${ev.type === "plan" ? "bg-secondary" : "bg-primary"}`} />
                        <span className="font-label-md text-on-surface-variant/70 text-[11px] uppercase">{ev.type === "plan" ? "Planned" : ev.type === "scheduled" ? "Scheduled Start" : "Scheduled End"}</span>
                      </div>
                      <p className="font-data-mono text-[12px] text-primary font-bold">{ev.iqaNumber}</p>
                      <p className="font-body-md text-on-surface mt-0.5">{ev.label.replace(/\s*\[(Start|End)\]/, "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedDay ? (
              <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-6 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/20">event_busy</span>
                <p className="font-body-md text-on-surface-variant/50 mt-2">No events on {selectedDay} {MONTHS[viewMonth]}</p>
              </div>
            ) : null}

            {/* Upcoming this month */}
            <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/10">
                <h4 className="font-headline-sm text-[16px]">Upcoming (Next 30d)</h4>
              </div>
              <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
                {upcomingList.slice(0, 8).length === 0 ? (
                  <p className="p-4 font-body-md text-on-surface-variant/50">No upcoming events</p>
                ) : upcomingList.slice(0, 8).map((ev, i) => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 ${ev.type === "plan" ? "bg-secondary/10" : "bg-primary/10"}`}>
                      <span className="font-data-mono font-bold text-[11px] leading-none">{new Date(ev.date).getDate()}</span>
                      <span className="font-label-md text-[9px] text-on-surface-variant/70 uppercase">{MONTHS[new Date(ev.date).getMonth()].slice(0, 3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-data-mono text-[11px] font-bold text-primary truncate">{ev.iqaNumber}</p>
                      <p className="font-label-md text-on-surface-variant/70 text-[11px] truncate">{ev.label}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${ev.type === "plan" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
                      {ev.type === "plan" ? "Plan" : "Sched"}
                    </span>
                  </div>
                ))}
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
                  {["Date", "Audit ID", "Domain", "Location", "Sublocation", "Type", "Coordinator", "Auditors"].map((h) => (
                    <th key={h} className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {[
                  ...auditPlans.filter((p) => filterDomain === "All" || p.domain === filterDomain).map((p) => ({
                    date: p.auditPlannedDate, iqaNumber: p.iqaNumber, domain: p.domain, location: p.location, sublocation: p.sublocation || "—",
                    type: "Planned" as const, coordinator: p.auditCoordinator, auditors: p.auditors
                  })),
                  ...scheduledAudits.filter((s) => filterDomain === "All" || s.domain === filterDomain).map((s) => ({
                    date: s.startDate, iqaNumber: s.iqaNumber, domain: s.domain, location: s.location, sublocation: s.sublocation || "—",
                    type: "Scheduled" as const, coordinator: s.auditCoordinator, auditors: s.auditors
                  }))
                ].sort((a, b) => a.date.localeCompare(b.date)).map((ev, idx) => (
                  <tr key={idx} className={`hover:bg-surface-container-low ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                    <td className="px-4 py-3 font-data-mono text-[12px] text-on-surface-variant whitespace-nowrap">
                      {ev.date ? new Date(ev.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 font-data-mono text-[12px] text-primary font-bold">{ev.iqaNumber}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold whitespace-nowrap">{ev.domain}</span>
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{ev.location}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{ev.sublocation}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${ev.type === "Planned" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>{ev.type}</span>
                    </td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{ev.coordinator}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(ev.auditors || []).map((a) => <span key={a} className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] whitespace-nowrap">{a}</span>)}
                      </div>
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
