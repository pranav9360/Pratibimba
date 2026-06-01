export default function UsersPage() {
  const users = [
    { name: "Ananya Iyer", email: "ananya.iyer@rashtrotthana.org", role: "Chief Auditor", dept: "Compliance", status: "Active" },
    { name: "Dr. Sarah J.", email: "sarah.j@rashtrotthana.org", role: "Senior Auditor", dept: "Diagnostics", status: "Active" },
    { name: "Marcus Thorne", email: "marcus.t@rashtrotthana.org", role: "Auditor", dept: "Finance", status: "Active" },
    { name: "Vikram Singh", email: "vikram.s@rashtrotthana.org", role: "Compliance Officer", dept: "Operations", status: "Active" },
    { name: "Anita Rao", email: "anita.r@rashtrotthana.org", role: "Auditor", dept: "HR", status: "Inactive" },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-headline-md text-on-surface">User Management</h2>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-md hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined">person_add</span>
          Add New User
        </button>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-secondary">
          <p className="font-label-md text-on-surface-variant">Total Users</p>
          <p className="font-display-lg text-on-surface">48</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-primary">
          <p className="font-label-md text-on-surface-variant">Active</p>
          <p className="font-display-lg text-primary">42</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-outline">
          <p className="font-label-md text-on-surface-variant">Inactive</p>
          <p className="font-display-lg text-on-surface-variant">6</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-soft border-l-4 border-tertiary">
          <p className="font-label-md text-on-surface-variant">Pending Invites</p>
          <p className="font-display-lg text-tertiary">3</p>
        </div>
      </section>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-soft p-4 flex gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-outline-variant/30 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
        <select className="border border-outline-variant/30 rounded-lg px-4 py-2 font-body-md bg-white">
          <option>All Roles</option>
          <option>Chief Auditor</option>
          <option>Senior Auditor</option>
          <option>Auditor</option>
          <option>Compliance Officer</option>
        </select>
        <select className="border border-outline-variant/30 rounded-lg px-4 py-2 font-body-md bg-white">
          <option>All Departments</option>
          <option>Compliance</option>
          <option>Finance</option>
          <option>Diagnostics</option>
          <option>Operations</option>
          <option>HR</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-soft overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {users.map((user, idx) => (
              <tr
                key={idx}
                className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-zebra" : ""}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-body-md font-semibold text-on-surface">
                        {user.name}
                      </p>
                      <p className="font-label-md text-on-surface-variant">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-body-md text-on-surface">
                  {user.role}
                </td>
                <td className="px-6 py-4 font-body-md text-on-surface">
                  {user.dept}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      user.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
                      <span className="material-symbols-outlined text-[18px]">
                        edit
                      </span>
                    </button>
                    <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors">
                      <span className="material-symbols-outlined text-[18px]">
                        more_vert
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
