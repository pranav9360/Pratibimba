import { PrakalpaAssignments, assignmentNames } from "../components/management/prakalpa-assignments";
import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { useState } from "react";
import { useApp, type AppUser, type Role } from "../context/app-context";
import { useEffect } from "react";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/userService";

const ROLE_OPTIONS: { value: Role; label: string; color: string }[] = [
  { value: "super_admin",       label: "Superadmin",       color: "bg-error/10 text-error border-error/20" },
  { value: "admin",             label: "Admin",             color: "bg-error/10 text-error border-error/20" },
  { value: "audit_coordinator", label: "Audit Coordinator", color: "bg-tertiary/10 text-tertiary border-tertiary/20" },
  { value: "auditor",           label: "Auditor",           color: "bg-secondary/10 text-secondary border-secondary/20" },
  { value: "prakalpa_manager",  label: "Prakalpa Manager",  color: "bg-surface-container text-on-surface-variant border-outline-variant" },
];

function roleMeta(role: Role) {
  return ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS.find((r) => r.value === "auditor")!;
}

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  phone: string;
  prakalpa: string;
  assignedPrakalpas: string[];
  replacementManagerId?: string;
};

const emptyForm = (): UserFormData => ({
  name: "",
  email: "",
  password: "",
  role: "auditor",
  active: true,
  phone: "",
  prakalpa: "",
  assignedPrakalpas: [],
});

interface UserFormProps {
  initial: UserFormData;
  onSave: (data: UserFormData) => void;
  currentUserRole: Role;
  managers: AppUser[];
  userId?: string;
  error?: string;
  onCancel: () => void;
  isEdit?: boolean;
}

function UserForm({ initial, onSave, currentUserRole, error, onCancel, isEdit, managers, userId }: UserFormProps) {
  const [form, setForm] = useState(initial);
  const [assignmentsReady, setAssignmentsReady] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v, ...(k === "role" && v === "prakalpa_manager" && f.role !== "prakalpa_manager" ? { assignedPrakalpas: [] } : {}) }));

  const unchangedManagerAssignment = isEdit && initial.role === "prakalpa_manager" && form.role === initial.role && form.active === initial.active && JSON.stringify(form.assignedPrakalpas) === JSON.stringify(initial.assignedPrakalpas);
  const valid =
  (form.role !== "prakalpa_manager" || !form.active || form.assignedPrakalpas.length > 0 || unchangedManagerAssignment) &&
  (form.role !== "prakalpa_manager" || assignmentsReady || (isEdit && initial.role === form.role && JSON.stringify(form.assignedPrakalpas) === JSON.stringify(initial.assignedPrakalpas))) &&
  form.name.trim() !== "" &&
  form.email.trim() !== "" &&
  form.email.includes("@") &&
  (
    isEdit ||
    form.password.length >= 8
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">{isEdit ? "Edit User" : "Add New User"}</h3>
          <p className="font-body-md text-on-surface-variant mt-1">
            {isEdit ? "Update user details and role assignment." : "Create a user account and select its initial role."}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-error/5 p-3 text-sm text-error">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          {!isEdit && (
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Password <span className="text-error">*</span>
              </label>

              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Role <span className="text-error">*</span></label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS.filter((role) => role.value !== "super_admin" || (isEdit && currentUserRole === "super_admin")).map((role) => (
                <button key={role.value} type="button" onClick={() => set("role", role.value)}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left ${form.role === role.value ? role.color + " border-current" : "border-outline-variant"}`}>
                  <span className="font-label-md text-[13px] font-bold">{role.label}</span>
                  {form.role === role.value && <span className="material-symbols-outlined ml-auto text-[18px]">check_circle</span>}
                </button>
              ))}
            </div>
          </div>

          {form.role === "prakalpa_manager" && (
            <PrakalpaAssignments managers={managers} userId={userId} value={form.assignedPrakalpas} onReady={setAssignmentsReady}
              onChange={names => setForm(previous => ({ ...previous, assignedPrakalpas: names }))} />
          )}

          {initial.role === "prakalpa_manager" && initial.active && <label className="block text-sm">Replacement Manager for released active Prakalpas
            <select aria-label="Replacement Manager" value={form.replacementManagerId || ""} onChange={event => set("replacementManagerId", event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="">No transfer — preserve current coverage</option>
              {managers.filter(manager => manager.active && manager.role === "prakalpa_manager" && manager.id !== userId).map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
            </select>
          </label>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const { currentUser, refreshLiveData } = useApp();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [replacementManagerId, setReplacementManagerId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (currentUser.role !== "super_admin") return;
    async function loadUsers() {
      try {
        const response = await getUsers();

        if (response.success) {
          setUsers(response.data);
        } else {
          console.error(response.message);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    }

    void loadUsers();
    window.addEventListener("focus", loadUsers);
    return () => window.removeEventListener("focus", loadUsers);
  }, [currentUser.role]);
  if (currentUser.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl mb-3">lock</span>
        <p className="font-headline-sm">Access Restricted</p>
        <p className="font-body-md mt-1">Only Superadmins can manage users.</p>
      </div>
    );
  }

  const canManageUser = (targetRole: Role) =>
    targetRole !== "super_admin" || currentUser.role === "super_admin";

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "all" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? u.active : !u.active);
    return matchRole && matchSearch && matchStatus;
  });

  const roleCounts = ROLE_OPTIONS.reduce<Record<string, number>>((acc, r) => {
    acc[r.value] = users.filter((u) => u.role === r.value).length;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="font-headline-md font-bold text-on-surface">User Management</h1>
          <p className="font-body-md text-on-surface-variant mt-1">{users.length} users · {users.filter((u) => u.active).length} active</p>
        </div>
        {currentUser.role === "super_admin" && <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-md font-bold hover:brightness-110 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add User
        </button>}
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
      <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search by name or email…" }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterRole !== "all" ? [{ key: "filterRole", label: "Role", value: ROLE_OPTIONS.find(role => role.value === filterRole)?.label ?? filterRole, onRemove: () => setFilterRole("all") }] : []),
            ...(filterStatus !== "all" ? [{ key: "filterStatus", label: "Status", value: filterStatus, onRemove: () => setFilterStatus("all") }] : [])
          ]}
          onClearAll={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }} resultCount={filtered.length} resultLabel="users shown">
          <FilterSelect label="Role" value={filterRole} onChange={value => setFilterRole(value as Role | "all")} options={ROLE_OPTIONS.map(role => ({ value: role.value, label: role.label }))} allValue="all" allLabel="All Roles" />
          <FilterSelect label="Status" value={filterStatus} onChange={value => setFilterStatus(value as typeof filterStatus)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} allValue="all" allLabel="All Statuses" />
        </FilterToolbar>

      {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
      {/* Users table */}
      <div className="bg-white rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant/10">
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 font-label-md text-on-surface-variant text-[11px] uppercase tracking-wider">Prakalpa</th>
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
                    <span className="font-body-md text-on-surface-variant text-[12px]">{(u.role === "prakalpa_manager" && !u.active && assignmentNames(u).length ? "Historical: " : "") + (assignmentNames(u).join(", ") || (u.role === "prakalpa_manager" ? "Assignments require reconciliation" : "—"))}</span>
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
                        onClick={() => {
                          if (!canManageUser(u.role)) return;
                          setFormError("");
                          setEditUser(u);
                          setShowForm(true);
                        }}
                        disabled={!canManageUser(u.role)}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant/60 hover:text-primary transition-colors"
                        title="Edit user"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!canManageUser(u.role)) return;
                          setFormError("");
                          setReplacementManagerId(""); setFormError(""); setConfirmDelete(u);
                        }}
                        disabled={!canManageUser(u.role)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant/60 hover:text-error transition-colors"
                        title="Deactivate user"
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
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <UserForm
          managers={users} userId={editUser?.id}
          currentUserRole={currentUser.role}
          error={formError}
          initial={
            editUser
              ? {
                  name: editUser.name,
                  email: editUser.email,
                  password: "",
                  role: editUser.role,
                  phone: editUser.phone ?? "",
                  prakalpa: editUser.prakalpa ?? "",
                  assignedPrakalpas: assignmentNames(editUser),
                  active: editUser.active,
                }
              : emptyForm()
          }
          isEdit={!!editUser}
          onCancel={() => { setShowForm(false); setEditUser(null); }}
          onSave={async (data) => {
            setFormError("");
            try {
              if (editUser) {
                const { password: _password, prakalpa: _legacy, assignedPrakalpas, ...profile } = data;
                const unchanged = profile.role === editUser.role && JSON.stringify(assignedPrakalpas) === JSON.stringify(assignmentNames(editUser));
                await updateUser(editUser.id, { ...profile, ...(unchanged ? {} : { assignedPrakalpas }) });
              } else {
                const { prakalpa: _legacy, ...creation } = data;
                await createUser(creation);
              }

              await refreshLiveData();
              const response = await getUsers().catch(() => null);

              if (response?.success) {
                setUsers(response.data);
              }

              setShowForm(false);
              setEditUser(null);
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Unable to save the user.");
            }
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
                <p className="font-label-md font-bold text-on-surface">Deactivate User</p>
                <p className="text-[12px] text-on-surface-variant">{confirmDelete.name}</p>
              </div>
            </div>
            <p className="font-body-md text-on-surface-variant mb-5">
              This will deactivate <strong>{confirmDelete.name}</strong>. The user will no longer be able to access the platform.
            </p>
            {formError && <p role="alert" className="mb-4 text-sm text-error">{formError}</p>}
            {confirmDelete.role === "prakalpa_manager" && <select aria-label="Deactivation replacement Manager" value={replacementManagerId} onChange={event => setReplacementManagerId(event.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Select replacement Manager for active Prakalpas…</option>
            {users.filter(user => user.active && user.role === "prakalpa_manager" && user.id !== confirmDelete.id).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>}
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await deleteUser(confirmDelete.id, replacementManagerId || undefined);
                    await refreshLiveData();

                    const response = await getUsers().catch(() => null);

                    if (response?.success) {
                      setUsers(response.data);
                    }

                    setConfirmDelete(null);
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : "Unable to deactivate the user.");
                  }
                }}
                className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold hover:brightness-110"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
