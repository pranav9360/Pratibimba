import Link from "next/link";

const notifications = {
  escalations: [
    {
      id: 1,
      title: "Escalation warning: Audit ID #992823 delayed",
      description:
        "The quarterly compliance audit for Mumbai Zonal Office has exceeded the response threshold. Required action: Re-assign or escalate to Director level.",
      time: "2 mins ago",
      unread: true,
    },
  ],
  tasks: [
    {
      id: 2,
      title: "Pending review reminder: 14 documents awaiting signature",
      description:
        "Verification queue has 14 pending items from the North Region Audit. Deadlines approaching in 24 hours.",
      time: "1 hour ago",
      unread: true,
    },
  ],
  system: [
    {
      id: 3,
      title: "Audit verified: Bengaluru Logistics Center",
      description:
        "Lead auditor Amit K. has approved all submitted documentation for the FY24 audit. Status: Completed.",
      time: "3 hours ago",
      unread: false,
      type: "success",
    },
    {
      id: 4,
      title: "Audit rejected: Inventory mismatch in Depot B7",
      description:
        "Rejection reason: Missing photographic evidence for stock audit items. Resubmission required.",
      time: "5 hours ago",
      unread: false,
      type: "error",
    },
    {
      id: 5,
      title: "System update: New compliance template available",
      description:
        "Version 4.2 of the Compliance Report Template has been published. Mandatory for all new audits.",
      time: "Yesterday",
      unread: false,
      type: "info",
    },
  ],
};

const stats = [
  { label: "Total", value: "42", icon: "inbox", color: "secondary" },
  { label: "Unread", value: "12", icon: "mark_as_unread", color: "primary" },
  { label: "Escalations", value: "03", icon: "warning", color: "tertiary" },
  { label: "Tasks", value: "08", icon: "task", color: "secondary" },
];

export default function NotificationsPage() {
  return (
    <div className="p-8 space-y-8 max-w-[1200px]">
      {/* Summary Cards */}
      <section className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest p-6 rounded-xl shadow-soft flex items-center justify-between group hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div>
              <p className="text-on-surface-variant font-label-md mb-1">
                {stat.label}
              </p>
              <h3 className={`font-display-lg text-${stat.color}`}>
                {stat.value}
              </h3>
            </div>
            <span
              className={`material-symbols-outlined text-${stat.color} opacity-20 text-4xl`}
            >
              {stat.icon}
            </span>
          </div>
        ))}
      </section>

      {/* Filters */}
      <section className="flex justify-between items-center">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md transition-all shadow-sm">
            All
          </button>
          <button className="px-4 py-2 bg-white text-on-surface-variant border border-outline-variant/30 rounded-lg font-label-md hover:bg-surface-variant transition-all">
            Audit
          </button>
          <button className="px-4 py-2 bg-white text-on-surface-variant border border-outline-variant/30 rounded-lg font-label-md hover:bg-surface-variant transition-all">
            Escalation
          </button>
          <button className="px-4 py-2 bg-white text-on-surface-variant border border-outline-variant/30 rounded-lg font-label-md hover:bg-surface-variant transition-all">
            System
          </button>
        </div>
        <button className="flex items-center gap-1 text-on-surface-variant/60 font-label-md hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-sm">done_all</span>
          Mark all as read
        </button>
      </section>

      {/* Notification Sections */}
      <div className="space-y-8">
        {/* Escalation Alerts */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h4 className="font-headline-sm text-tertiary flex items-center gap-2">
              <span className="material-symbols-outlined filled">error</span>
              Escalation Alerts
            </h4>
            <span className="px-2 py-0.5 bg-tertiary/10 text-tertiary font-label-md rounded font-bold">
              Priority: High
            </span>
          </div>
          <div className="space-y-4">
            {notifications.escalations.map((notif) => (
              <div
                key={notif.id}
                className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-tertiary flex items-start gap-6 group hover:bg-surface-container-lowest transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
                  <span className="material-symbols-outlined">
                    priority_high
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h5 className="font-body-lg text-on-surface font-bold leading-tight">
                      {notif.title}
                    </h5>
                    <span className="font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant/50 pt-1">
                      {notif.time}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface-variant mt-1">
                    {notif.description}
                  </p>
                  <div className="mt-4 flex gap-6">
                    <button className="px-4 py-1.5 bg-tertiary/10 text-tertiary rounded-lg font-label-md font-bold hover:bg-tertiary hover:text-white transition-all">
                      Review Case
                    </button>
                    <button className="px-4 py-1.5 border border-outline-variant/30 text-on-surface-variant rounded-lg font-label-md hover:bg-surface-variant transition-all">
                      Mute Alerts
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notif.unread && (
                    <div className="w-2 h-2 bg-tertiary rounded-full" />
                  )}
                  <button className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-on-surface-variant hover:text-primary transition-all">
                    more_vert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Task Reminders */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h4 className="font-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined filled">
                assignment_late
              </span>
              Pending Task Reminders
            </h4>
            <span className="px-2 py-0.5 bg-primary/10 text-primary font-label-md rounded font-bold">
              Priority: Medium
            </span>
          </div>
          <div className="space-y-4">
            {notifications.tasks.map((notif) => (
              <div
                key={notif.id}
                className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-primary flex items-start gap-6 group hover:bg-surface-container-lowest transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">rate_review</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h5 className="font-body-lg text-on-surface font-bold leading-tight">
                      {notif.title}
                    </h5>
                    <span className="font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant/50 pt-1">
                      {notif.time}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface-variant mt-1">
                    {notif.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notif.unread && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                  <button className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-on-surface-variant hover:text-primary transition-all">
                    more_vert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* System Activity */}
        <section>
          <h4 className="font-headline-sm text-secondary flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined filled">history</span>
            System Activity & Updates
          </h4>
          <div className="bg-white rounded-xl shadow-soft overflow-hidden">
            {notifications.system.map((notif, idx) => (
              <div
                key={notif.id}
                className={`flex items-start gap-6 group hover:bg-surface-variant/20 transition-all border-b border-outline-variant/10 py-6 px-6 ${idx % 2 === 1 ? "bg-zebra" : ""}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    notif.type === "success"
                      ? "bg-secondary-fixed text-secondary"
                      : notif.type === "error"
                        ? "bg-error-container text-error"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {notif.type === "success"
                      ? "verified"
                      : notif.type === "error"
                        ? "cancel"
                        : "info"}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h5 className="font-label-md text-on-surface font-medium font-bold">
                      {notif.title}
                    </h5>
                    <span className="font-data-mono text-[11px] uppercase tracking-wider text-on-surface-variant/50 pt-1">
                      {notif.time}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface-variant">
                    {notif.description}
                  </p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-on-surface-variant">
                  check_circle
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
