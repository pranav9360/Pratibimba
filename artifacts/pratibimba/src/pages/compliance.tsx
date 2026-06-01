const complianceStats = [
  { label: "Overall Score", value: "94.2%", icon: "verified", color: "text-secondary", borderColor: "border-secondary" },
  { label: "Compliant Areas", value: "47", icon: "check_circle", color: "text-secondary", borderColor: "border-secondary" },
  { label: "Non-Compliant", value: "3", icon: "cancel", color: "text-error", borderColor: "border-error" },
  { label: "Under Review", value: "8", icon: "pending", color: "text-primary", borderColor: "border-primary" },
];

const complianceAreas = [
  { area: "Financial Reporting", score: 98, trend: "+2%", status: "compliant" },
  { area: "Data Privacy (GDPR)", score: 95, trend: "+1%", status: "compliant" },
  { area: "Safety Protocols", score: 89, trend: "-3%", status: "at-risk" },
  { area: "HR Compliance", score: 97, trend: "0%", status: "compliant" },
  { area: "Environmental", score: 72, trend: "-5%", status: "non-compliant" },
  { area: "IT Security", score: 91, trend: "+4%", status: "compliant" },
];

export default function CompliancePage() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">Compliance & Reporting</h2>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Report
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceStats.map((stat) => (
          <div key={stat.label} className={`bg-white p-6 rounded-xl shadow-soft border-l-4 ${stat.borderColor}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-label-md text-on-surface-variant">{stat.label}</p>
              <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className={`font-display-lg ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Compliance by Area</h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {complianceAreas.map((item) => (
            <div key={item.area} className="p-6 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md font-semibold text-on-surface">{item.area}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-label-md font-bold ${item.trend.startsWith("+") ? "text-secondary" : item.trend === "0%" ? "text-on-surface-variant" : "text-error"}`}>{item.trend}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${item.status === "compliant" ? "bg-secondary/10 text-secondary" : item.status === "at-risk" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                      {item.status}
                    </span>
                    <span className="font-headline-sm font-bold text-on-surface w-12 text-right">{item.score}%</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${item.score >= 95 ? "bg-secondary" : item.score >= 85 ? "bg-primary" : "bg-error"}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
