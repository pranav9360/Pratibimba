const users = [
  { name: "Ananya Iyer", role: "Chief Auditor", dept: "Management", email: "ananya.iyer@rashtrotthana.org", status: "active", initials: "AI" },
  { name: "Vikram Singh", role: "Senior Auditor", dept: "Finance", email: "vikram.singh@rashtrotthana.org", status: "active", initials: "VS" },
  { name: "Dr. Sarah Jenkins", role: "Compliance Specialist", dept: "Diagnostics", email: "sarah.jenkins@rashtrotthana.org", status: "active", initials: "SJ" },
  { name: "Marcus Thorne", role: "Audit Analyst", dept: "Operations", email: "marcus.thorne@rashtrotthana.org", status: "inactive", initials: "MT" },
  { name: "Anita Rao", role: "Verification Officer", dept: "HR & Admin", email: "anita.rao@rashtrotthana.org", status: "active", initials: "AR" },
  { name: "Rohan Mehra", role: "Financial Auditor", dept: "Finance", email: "rohan.mehra@rashtrotthana.org", status: "active", initials: "RM" },
];

export default function UsersPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">User Management</h2>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110 transition-all">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add New User
        </button>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: "24", icon: "group", color: "text-primary" },
          { label: "Active", value: "21", icon: "person_check", color: "text-secondary" },
          { label: "Inactive", value: "3", icon: "person_off", color: "text-on-surface-variant" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-soft border border-outline-variant/10 flex items-center justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant/70">{stat.label}</p>
              <p className={`font-display-lg mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
            <span className={`material-symbols-outlined text-[40px] opacity-20 ${stat.color}`}>{stat.icon}</span>
          </div>
        ))}
      </section>

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="font-headline-sm">All Users</h3>
          <div className="flex gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">search</span>
              <input type="text" placeholder="Search users..." className="pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-primary/20 focus:border-primary outline-none transition-all bg-surface-container-lowest" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/10">
              <tr>
                {["User", "Role", "Department", "Email", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {users.map((user, idx) => (
                <tr key={user.email} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-zebra" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[12px]">{user.initials}</div>
                      <span className="font-body-md font-semibold text-on-surface">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-body-md text-on-surface">{user.role}</td>
                  <td className="px-6 py-4 font-body-md text-on-surface">{user.dept}</td>
                  <td className="px-6 py-4 font-data-mono text-[12px] text-on-surface-variant">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${user.status === "active" ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface-variant"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">edit</button>
                      <button className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors">delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
