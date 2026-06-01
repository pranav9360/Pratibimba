const deptRates = [
  { name: "Finance", rate: 98, color: "bg-green-500" },
  { name: "HR & Admin", rate: 92, color: "bg-secondary" },
  { name: "Operations", rate: 88, color: "bg-primary" },
  { name: "Legal", rate: 76, color: "bg-error" },
];

const escalationReasons = [
  { reason: "Missing Data", percentage: 45 },
  { reason: "Risk Conflict", percentage: 30 },
  { reason: "Policy Breach", percentage: 15 },
  { reason: "Other", percentage: 10 },
];

const recentReports = [
  { name: "Q3_Security_Audit_Final.pdf", type: "System Security", author: "Sarah J. Jenkins", date: "2023-10-14 09:22", status: "Approved" },
  { name: "Annual_Operational_Risk_2023.xlsx", type: "Risk Assessment", author: "Marcus Thorne", date: "2023-10-12 14:45", status: "Under Review" },
  { name: "HR_Compliance_Summary.docx", type: "HR Compliance", author: "Anita Rao", date: "2023-10-10 11:00", status: "Approved" },
];

export default function ReportsPage() {
  return (
    <div className="p-8 space-y-6 max-w-[1440px] mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">Reports & Analytics</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant gap-3 text-on-surface-variant cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span className="font-body-md">Last 30 Days</span>
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
          <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant gap-3 text-on-surface-variant cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
            <span className="font-body-md">All Departments</span>
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Audits", value: "842", change: "+12.5%", borderColor: "border-l-primary" },
          { label: "Completed", value: "712", subtext: "84.5% success", borderColor: "border-l-green-500" },
          { label: "Failed", value: "48", subtext: "Critical issues", borderColor: "border-l-error" },
          { label: "Escalated", value: "82", subtext: "Review required", borderColor: "border-l-purple-500" },
          { label: "Avg. Verify Time", value: "3.2", unit: "d", change: "-0.5d vs LY", borderColor: "border-l-blue-500" },
          { label: "Compliance %", value: "94.2%", subtext: "Target reached", borderColor: "border-l-primary-container" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-surface-container-lowest rounded-xl shadow-soft border-l-4 ${stat.borderColor} p-6`}>
            <p className="text-on-surface-variant font-label-md">{stat.label}</p>
            <p className="font-display-lg text-on-background font-black">
              {stat.value}{stat.unit && <span className="font-headline-sm font-normal">{stat.unit}</span>}
            </p>
            <div className="font-label-md mt-2">
              {stat.change && <span className="text-on-primary-fixed-variant">{stat.change}</span>}
              {stat.subtext && <span className="text-on-surface-variant/60">{stat.subtext}</span>}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-soft p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-sm text-on-background font-extrabold">Monthly Audit Trends</h3>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded bg-secondary/10 text-secondary text-xs font-bold">Volume</span>
              <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold">Target</span>
            </div>
          </div>
          <div className="flex-1 h-64 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 800 240">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "rgba(64, 89, 170, 0.2)", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "rgba(64, 89, 170, 0)", stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              {[40, 90, 140, 190].map((y) => (
                <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#d1d5db" strokeDasharray="4" />
              ))}
              <path d="M0,180 L133,160 L266,120 L400,140 L533,90 L666,110 L800,70 L800,240 L0,240 Z" fill="url(#grad1)" />
              <path d="M0,180 L133,160 L266,120 L400,140 L533,90 L666,110 L800,70" fill="none" stroke="#4059aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {[[0, 180], [133, 160], [266, 120], [400, 140], [533, 90], [666, 110], [800, 70]].map(([cx, cy], idx) => (
                <circle key={idx} cx={cx} cy={cy} r="4" fill="#4059aa" />
              ))}
            </svg>
            <div className="flex justify-between mt-4 text-on-surface font-data-mono uppercase text-[10px] font-bold">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl shadow-soft p-6">
          <h3 className="font-headline-sm text-on-background mb-6 font-extrabold">Dept. Success Rates</h3>
          <div className="space-y-4">
            {deptRates.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex justify-between font-label-md">
                  <span>{dept.name}</span>
                  <span className="font-bold">{dept.rate}%</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className={`${dept.color} h-2 rounded-full`} style={{ width: `${dept.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-outline-variant">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">lightbulb</span>
              </div>
              <div>
                <p className="font-label-md text-on-surface-variant">Top Performer</p>
                <p className="font-body-lg font-bold text-on-background">Finance Division</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl shadow-soft p-6 flex flex-col items-center">
          <h3 className="font-headline-sm text-on-background w-full mb-6 text-left font-extrabold">Verification Split</h3>
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
              <circle cx="18" cy="18" r="16" fill="transparent" stroke="#10b981" strokeDasharray="85 100" strokeWidth="4" />
              <circle cx="18" cy="18" r="16" fill="transparent" stroke="#ef4444" strokeDasharray="15 100" strokeDashoffset="-85" strokeWidth="4" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline-md font-bold text-on-background">85%</span>
              <span className="text-[10px] text-on-surface-variant font-medium">VERIFIED</span>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex items-center gap-2 font-label-md"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Verified</span></div>
            <div className="flex items-center gap-2 font-label-md"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Rejected</span></div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-soft p-6">
          <h3 className="font-headline-sm text-on-background mb-6 font-extrabold">Escalation Analytics</h3>
          <div className="space-y-4">
            {escalationReasons.map((item) => (
              <div key={item.reason} className="flex items-center gap-4">
                <span className="w-32 font-label-md text-on-surface-variant">{item.reason}</span>
                <div className="flex-1 bg-surface-container rounded h-4 overflow-hidden flex">
                  <div className="bg-purple-500 h-full" style={{ width: `${item.percentage}%` }} />
                </div>
                <span className="w-8 font-label-md font-bold">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl shadow-soft overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-outline-variant/20">
          <div>
            <h3 className="font-headline-sm text-on-background font-extrabold">Recent Reports</h3>
            <p className="font-label-md text-on-surface-variant">Generated audit documentation</p>
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-lg font-label-md font-bold">Generate New Report</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                {["Report Name", "Type", "Generated Date", "Author", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-label-md text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {recentReports.map((report, idx) => (
                <tr key={idx} className="hover:bg-zebra transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-secondary">description</span>
                      <span className="font-body-md font-semibold text-on-surface">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-label-md text-on-surface-variant">{report.type}</td>
                  <td className="px-6 py-4 font-data-mono text-xs">{report.date}</td>
                  <td className="px-6 py-4 font-body-md text-on-surface">{report.author}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${report.status === "Approved" ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>{report.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-4">
                      <button className="p-1.5 hover:bg-surface-container rounded-lg text-secondary transition-all" title="Download">
                        <span className="material-symbols-outlined text-xl">download</span>
                      </button>
                      <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-all" title="Share">
                        <span className="material-symbols-outlined text-xl">share</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
