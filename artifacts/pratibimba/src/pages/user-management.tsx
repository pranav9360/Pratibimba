import { useState } from "react";
import { useApp, type AppUser, type Role, DOMAINS } from "../context/app-context";

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: "admin",             label: "Admin",             color: "bg-error/10 text-error border-error/20" },
  { value: "lead_auditor",      label: "Lead Auditor",      color: "bg-primary/10 text-primary border-primary/20" },
  { value: "audit_coordinator", label: "Audit Coordinator", color: "bg-tertiary/10 text-tertiary border-tertiary/20" },
  { value: "auditor",           label: "Auditor",           color: "bg-secondary/10 text-secondary border-secondary/20" },
  { value: "prakalpa_manager",  label: "Prakalpa Manager",  color: "bg-surface-container text-on-surface-variant border-outline-variant" },
];

function roleMeta(role: Role) {
  return ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[3];
}

const emptyForm = (): Omit<AppUser, "id" | "createdDate"> => ({
  name: "", email: "", role: "auditor", active: true, phone: "", domain: "",
});

interface UserFormProps {
  initial: Omit<AppUser, "id" | "createdDate">;
  onSave: (data: Omit<AppUser, "id" | "createdDate">) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

function UserForm({ initial, onSave, onCancel, isEdit }: UserFormProps) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.name.trim() !== "" && form.email.trim() !== "" && form.email.includes("@");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">{isEdit ? "Edit User" : "Add New User"}</h3>
          <p className="font-body-md text-on-surface-variant mt-1">
            {isEdit ? "Update user details and role assignment." : "Add a user to the Pratibimba platform."}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Full Name <span className="text-error">*</span></label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ananya Iyer"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Email Address <span className="text-error">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="user@rashtrotthana.org"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Role <span className="text-error">*</span></label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("role", r.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all ${form.role === r.value ? r.color + " border-current" : "border-outline-variant hover:border-primary/30"}`}
                >
                  <span className={`material-symbols-outlined text-[18px] ${form.role === r.value ? "" : "text-on-surface-variant/50"}`}>
                    {r.value === "admin" ? "shield_person" : r.value === "lead_auditor" ? "verified_user" : r.value === "audit_coordinator" ? "group_work" : r.value === "auditor" ? "search" : "store"}
                  </span>
                  <div>
                    <p className="font-label-md font-bold text-[13px]">{r.label}</p>
                    <p className="text-[11px] text-on-surface-variant/70 leading-tight">
                      {r.value === "admin" && "Manages users, roles, and platform access."}
                      {r.value === "lead_auditor" && "Creates audit plans, assigns teams."}
                      {r.value === "audit_coordinator" && "Leads field audit teams with auditors."}
                      {r.value === "auditor" && "Part of the field audit team."}
                      {r.value === "prakalpa_manager" && "Oversees a domain unit or prakalpa."}
                    </p>
                  </div>
                  {form.role === r.value && <span className="material-symbols-outlined text-[18px] ml-auto">check_circle</span>}
                </button>
              ))}
            </div>
          </div>

          {form.role === "prakalpa_manager" && (
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Domain</label>
              <select
                value={form.domain ?? ""}
                onChange={(e) => set("domain", e.target.value)}
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Select domain…</option>
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Phone (optional)</label>
              <input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="9800000000"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Status</label>
              <div className="flex gap-3 mt-2.5">
                <button type="button" onClick={() => set("active", true)} className={`flex-1 py-2 rounded-lg text-[12px] font-bold border-2 transition-all ${form.active ? "bg-primary/10 text-primary border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/30"}`}>Active</button>
                <button type="button" onClick={() => set("active", false)} className={`flex-1 py-2 rounded-lg text-[12px] font-bold border-2 transition-all ${!form.active ? "bg-error/10 text-error border-error" : "border-outline-variant text-on-surface-variant hover:border-error/30"}`}>Inactive</button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => onSave(form)}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-40"
          >
            {isEdit ? "Save Changes" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser, currentUser } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");

  if (currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl mb-3">lock</span>
        <p className="font-headline-sm">Access Restricted</p>
        <p className="font-body-md mt-1">Only admins can manage users.</p>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const roleCounts = ROLE_OPTIONS.reduce<Record<string, number>>((acc, r) => {
    acc[r.value] = users.filter((u) => u.role === r.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-headline-md font-bold text-on-surface">User Management</h1>
          <p className="font-body-md text-on-surface-variant mt-1">{users.length} users · {users.filter((u) => u.active).length} active</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-md font-bold hover:brightness-110 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add User
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilterRole(filterRole === r.value ? "all" : r.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${filterRole === r.value ? r.color + " border-current shadow-md" : "bg-white border-outline-variant/30 hover:border-primary/30"}`}
          >
            <p className="font-data-mono text-2xl font-bold">{roleCounts[r.value] ?? 0}</p>
            <p className="font-label-md text-[11px] mt-1 leading-tight">{r.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-outline-variant rounded-xl font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as Role | "all")}
          className="border border-outline-variant rounded-xl px-4 py-2.5 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant/10">
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Domain</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Added</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-on-surface-variant/50 font-body-md">No users found</td>
              </tr>
            ) : filtered.map((u) => {
              const meta = roleMeta(u.role);
              const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
              return (
                <tr key={u.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[11px] shrink-0">
                        {initials}
                      </div>
                      <span className="font-label-md font-bold text-on-surface text-[13px]">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-body-md text-on-surface-variant text-[12px]">{u.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.color}`}>{meta.label}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-body-md text-on-surface-variant text-[12px]">{u.domain || "—"}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${u.active ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-primary" : "bg-error"}`} />
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-data-mono text-[11px] text-on-surface-variant/60">
                      {new Date(u.createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditUser(u); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant/60 hover:text-primary transition-colors"
                        title="Edit user"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant/60 hover:text-error transition-colors"
                        title="Remove user"
                      >
                        <span className="material-symbols-outlined text-[17px]">person_remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <UserForm
          initial={editUser ? { name: editUser.name, email: editUser.email, role: editUser.role, phone: editUser.phone, domain: editUser.domain, active: editUser.active } : emptyForm()}
          isEdit={!!editUser}
          onCancel={() => { setShowForm(false); setEditUser(null); }}
          onSave={(data) => {
            if (editUser) {
              updateUser(editUser.id, data);
            } else {
              addUser(data);
            }
            setShowForm(false);
            setEditUser(null);
          }}
        />
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-sm z-10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-[22px]">warning</span>
              </div>
              <div>
                <p className="font-label-md font-bold text-on-surface">Remove User</p>
                <p className="text-[12px] text-on-surface-variant">{confirmDelete.name}</p>
              </div>
            </div>
            <p className="font-body-md text-on-surface-variant mb-5">
              This will permanently remove <strong>{confirmDelete.name}</strong> from the platform. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
              <button
                onClick={() => { deleteUser(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold hover:brightness-110"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
