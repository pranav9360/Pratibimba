import { PrakalpaAssignments, assignmentNames } from "../components/management/prakalpa-assignments";
import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { useEffect, useMemo, useState } from "react";
import { useApp, type AppUser, type Role } from "../context/app-context";
import { getAdministrativeActivity, type AdministrativeActivity } from "../services/activityLogService";
import { getUsers, updateUserRole, updateUser } from "../services/userService";
import { getRoles, updateRole, createRole, deleteRole, type StoredRole } from "../services/roleService";

const PERMISSION_LABELS: Record<string, string> = {
  canCreateAuditPlan: "Create Audit Plans", canScheduleAudit: "Schedule Audits",
  canEditReport: "Edit Reports", canCloseReport: "Close Reports",
  canViewAllReports: "View All Reports", canManageRoles: "Manage Role Permissions",
  canManageUsers: "Manage Users", canViewDashboard: "View Dashboard", canAddAuditor: "Add Auditors",
  canAssignAuditCoordinator: "Assign Audit Coordinators", canAssignAuditors: "Assign Auditors",
  canAssignLeadAuditor: "Assign Lead Auditors", canSubmitFindings: "Submit Findings",
  canReviewFindings: "Review Findings", canSubmitFindingsToCoordinator: "Submit Findings to Coordinator",
  canGenerateReport: "Generate Reports", canSendReportToPrakalpa: "Send Reports to Prakalpa",
  canSubmitCorrectiveAction: "Submit Corrective Actions", canVerifyCorrectiveAction: "Verify Corrective Actions",
  canManagePrakalpas: "Manage Prakalpas", canManageAdmins: "Manage Administrator Accounts",
};
const ADMINISTRATIVE_PERMISSIONS = new Set([
  "canManageRoles", "canManageUsers", "canManageAdmins", "canManagePrakalpas", "canViewAllReports",
]);

const ROLE_META: Record<Role, { label: string; color: string; icon: string; policy: string; capabilities: string[] }> = {
  super_admin: {
    label: "Superadmin",
    color: "text-error",
    icon: "admin_panel_settings",
    policy: "All Admin capabilities plus protected Superadmin account management and activity logs.",
    capabilities: [
      "All Admin application and audit administration",
      "Manage Prakalpas, locations and sublocations",
      "Manage role definitions and permissions",
      "Create user accounts",
      "Assign and change user roles",
      "Organization-wide administrative visibility",
    ],
  },
  admin: {
    label: "Admin",
    color: "text-error",
    icon: "shield_person",
    policy: "Audit planning, scheduling, and organization-wide reporting. Administrative management is reserved for Superadmin.",
    capabilities: [
      "Create and maintain audit plans",
      "Manage scheduled audits subject to workflow lifecycle guards",
      "Organization-wide audit and report visibility",
    ],
  },
  audit_coordinator: {
    label: "Audit Coordinator",
    color: "text-tertiary",
    icon: "group_work",
    policy: "Coordinator-owned scheduling, finding review, report generation, and corrective-action verification workflows.",
    capabilities: [
      "Schedule and manage assigned audits",
      "Review assigned findings and generate reports",
      "Verify corrective actions in coordinator workflow",
    ],
  },
  auditor: {
    label: "Auditor",
    color: "text-secondary",
    icon: "person_search",
    policy: "Assigned audit work, finding submission, and lead-auditor review where assigned. Cannot perform coordinator approvals.",
    capabilities: [
      "Submit findings for assigned audits",
      "Review findings only when assigned as Lead Auditor",
    ],
  },
  prakalpa_manager: {
    label: "Prakalpa Manager",
    color: "text-on-surface-variant",
    icon: "supervised_user_circle",
    policy: "Prakalpa-scoped report access and corrective-action submission.",
    capabilities: [
      "View reports within the assigned Prakalpa",
      "Submit corrective actions for that Prakalpa",
    ],
  },
};

const ROLE_OPTIONS = Object.keys(ROLE_META) as Role[];

function getRoleLabel(role: string) {
  return ROLE_META[role as Role]?.label ?? role;
}

function formatChange(value: Record<string, unknown>) {
  const details: string[] = [];
  if (typeof value.role === "string") details.push(getRoleLabel(value.role));
  if (typeof value.active === "boolean") details.push(value.active ? "Active" : "Inactive");
  for (const key of ["name", "email", "phone", "prakalpa"]) {
    if (typeof value[key] === "string" && value[key]) details.push(`${key}: ${value[key]}`);
  }
  if (value.passwordChanged === true) details.push("Password changed");
  if (value.permissions && typeof value.permissions === "object") {
    details.push(Object.entries(value.permissions).map(([key, enabled]) =>
      `${PERMISSION_LABELS[key] ?? key}: ${enabled ? "On" : "Off"}`).join(", "));
  }
  if (Array.isArray(value.assignedPrakalpas) && value.assignedPrakalpas.length) {
    details.push(`Assigned Prakalpas: ${value.assignedPrakalpas.join(", ")}`);
  }
  return details.join(" · ") || "No prior details";
}

export default function RoleAccessPage() {
  const { currentUser, refreshLiveData } = useApp();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [logs, setLogs] = useState<AdministrativeActivity[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [target, setTarget] = useState<AppUser | null>(null);
  const [nextRole, setNextRole] = useState<Role>("auditor");
  const [selectedPrakalpas, setSelectedPrakalpas] = useState<string[]>([]);
  const [replacementManagerId, setReplacementManagerId] = useState("");
  const [assignmentsReady, setAssignmentsReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [logError, setLogError] = useState("");
  const [roles, setRoles] = useState<StoredRole[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [renamingRole, setRenamingRole] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const isSuperAdmin = currentUser.role === "super_admin";
  const canAccess = isSuperAdmin;
  const loadRoles = async () => {
    try { setRoles(await getRoles(true)); }
    catch (error) { setPageError(error instanceof Error ? error.message : "Unable to load roles."); }
  };

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || "Unable to load users.");
      }
      setUsers(response.data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load users.");
    }
  };

  const loadLogs = async () => {
    try {
      setLogs(await getAdministrativeActivity());
      setLogError("");
    } catch (error) {
      setLogError(error instanceof Error ? error.message : "Unable to load activity logs.");
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void loadUsers();
    void loadRoles();
    if (isSuperAdmin) void loadLogs();
  }, [currentUser.role]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) =>
      (filterRole === "all" || user.role === filterRole) &&
      (filterStatus === "all" || (filterStatus === "active" ? user.active : !user.active)) &&
      (!query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
    );
  }, [users, search, filterRole, filterStatus]);

  if (!canAccess) {
    return (
      <div className="p-6 text-center">
        <h1 className="font-headline-md text-on-surface">Access Restricted</h1>
        <p className="mt-2 text-on-surface-variant">Only Superadmins can manage roles.</p>
      </div>
    );
  }

  const saveRole = async () => {
    if (!target || saving) return;
    setSaving(true);
    setPageError("");
    try {
      if (nextRole === "prakalpa_manager") {
        if (target.active && !selectedPrakalpas.length) throw new Error("Select a Prakalpa for the Manager.");
        await updateUser(target.id, { role: nextRole, assignedPrakalpas: selectedPrakalpas, ...(replacementManagerId ? { replacementManagerId } : {}) });
      } else if (replacementManagerId) {
        await updateUser(target.id, { role: nextRole, replacementManagerId });
      } else {
        await updateUserRole(target.id, nextRole);
      }
      setTarget(null);
      await Promise.all([loadUsers(), ...(isSuperAdmin ? [loadLogs()] : []), refreshLiveData()]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to update the user's role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="font-label-md text-primary uppercase tracking-wider text-xs">Role Management</p>
        <h1 className="mt-1 font-headline-md font-bold text-on-surface">Roles &amp; Permissions</h1>
        <p className="mt-1 font-body-md text-on-surface-variant">
          Review role boundaries, manage assignments, and audit sensitive changes.
        </p>
      </header>

      {pageError && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
          {pageError}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-headline-sm text-on-surface">Stored role-permission configuration</h2>
        <p className="text-sm text-on-surface-variant">These settings are saved, but do not grant or revoke application access. Server role, assignment, and workflow rules enforce effective access.</p>
        <p className="text-sm text-on-surface-variant">Custom definitions store configuration and cannot currently be assigned to user accounts.</p>
        <form className="flex gap-2" onSubmit={async (event) => {
          event.preventDefault(); if (saving) return; setSaving(true); setPageError("");
          try { await createRole(newRoleName.trim()); setNewRoleName(""); await loadRoles(); if (isSuperAdmin) void loadLogs(); }
          catch (error) { setPageError(error instanceof Error ? error.message : "Unable to create role."); }
          finally { setSaving(false); }
        }}>
          <input aria-label="New role name" required pattern="[a-z][a-z0-9_]*" value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="New role name" className="rounded-lg border px-3 py-2" />
          <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-on-primary">Create role</button>
        </form>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead><tr><th className="p-3">Permission</th>{roles.map((role) => <th key={role._id} className="p-3">{getRoleLabel(role.name)}
              {!ROLE_OPTIONS.includes(role.name as Role) && <>
              <span className="block text-xs text-on-surface-variant">{role.active ? "Active" : "Inactive"}</span>
              {renamingRole === role._id ? <form onSubmit={async (event) => {
                event.preventDefault(); if (saving) return; setSaving(true); setPageError("");
                try { await updateRole(role._id, { name: renameValue.trim() }); setRenamingRole(null); await loadRoles(); if (isSuperAdmin) void loadLogs(); }
                catch (error) { setPageError(error instanceof Error ? error.message : "Unable to rename role."); }
                finally { setSaving(false); }
              }}>
                <input aria-label={`Rename ${role.name}`} required pattern="[a-z][a-z0-9_]*" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="mt-2 w-40 rounded border px-2 py-1" />
                <button disabled={saving} className="mx-2 text-xs text-primary">Save name</button>
                <button type="button" disabled={saving} onClick={() => setRenamingRole(null)} className="text-xs">Cancel</button>
              </form> : <button disabled={saving} className="block text-xs text-primary" onClick={() => { setRenamingRole(role._id); setRenameValue(role.name); }}>Rename</button>}
              <button disabled={saving} className="block text-xs text-error" onClick={async () => {
                if (!window.confirm(`${role.active ? "Deactivate" : "Reactivate"} role ${role.name}?`)) return;
                setSaving(true); setPageError("");
                try { if (role.active) await deleteRole(role._id); else await updateRole(role._id, { active: true }); await loadRoles(); if (isSuperAdmin) void loadLogs(); }
                catch (error) { setPageError(error instanceof Error ? error.message : "Unable to change role status."); }
                finally { setSaving(false); }
              }}>{role.active ? "Deactivate" : "Reactivate"}</button></>}
            </th>)}</tr></thead>
            <tbody>{Object.entries(PERMISSION_LABELS).map(([permission, label]) => <tr key={permission} className="border-t">
              <td className="p-3">{label}</td>{roles.map((role) => {
                const enabled = role.permissions[permission] === true;
                const protectedRole = role.name === "super_admin" && !isSuperAdmin;
                const restrictedGrant = !enabled && (
                  (ADMINISTRATIVE_PERMISSIONS.has(permission) && !["admin", "super_admin"].includes(role.name)) ||
                  (permission === "canManageAdmins" && role.name !== "super_admin")
                );
                return <td key={role._id} className="p-3"><input type="checkbox" aria-label={`${getRoleLabel(role.name)}: ${label}`} checked={enabled} disabled={saving || protectedRole || restrictedGrant}
                  onChange={async (event) => {
                    const value = event.target.checked; setSaving(true); setPageError("");
                    try {
                      const updated = await updateRole(role._id, { permissions: { [permission]: value } });
                      setRoles((previous) => previous.map((entry) => entry._id === updated._id ? updated : entry));
                      if (isSuperAdmin) void loadLogs();
                    } catch (error) { setPageError(error instanceof Error ? error.message : "Unable to save permissions."); }
                    finally { setSaving(false); }
                  }} /></td>;
              })}
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-headline-sm text-on-surface">Effective access policy</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_OPTIONS.map((role) => {
            const meta = ROLE_META[role];
            return (
              <article key={role} className="rounded-xl border border-outline-variant/20 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`material-symbols-outlined ${meta.color}`}>{meta.icon}</span>
                  <h3 className={`font-label-md font-bold ${meta.color}`}>{meta.label}</h3>
                </div>
                <p className="text-sm leading-relaxed text-on-surface-variant">{meta.policy}</p>
                <ul className="mt-3 space-y-1 border-t border-outline-variant/10 pt-3">
                  {meta.capabilities.map((capability) => (
                    <li key={capability} className="flex gap-2 text-xs leading-relaxed text-on-surface-variant">
                      <span aria-hidden="true" className="text-primary">•</span>
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface-variant">
          Permission settings are persisted without changing server role boundaries or assignment requirements.
        </p>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <h2 className="font-headline-sm text-on-surface">Role assignments</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Role changes require confirmation and are recorded in the activity log.</p>
          </div>
          <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search name or email" }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterRole !== "all" ? [{ key: "filterRole", label: "Role", value: ROLE_META[filterRole as Role]?.label ?? filterRole, onRemove: () => setFilterRole("all") }] : []),
            ...(filterStatus !== "all" ? [{ key: "filterStatus", label: "Status", value: filterStatus, onRemove: () => setFilterStatus("all") }] : [])
          ]}
          onClearAll={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }} resultCount={filteredUsers.length} resultLabel="users shown">
          <FilterSelect label="Role" value={filterRole} onChange={value => setFilterRole(value as Role | "all")} options={ROLE_OPTIONS.map(role => ({ value: role, label: ROLE_META[role].label }))} allValue="all" allLabel="All Roles" />
          <FilterSelect label="Status" value={filterStatus} onChange={value => setFilterStatus(value as typeof filterStatus)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} allValue="all" allLabel="All Statuses" />
        </FilterToolbar>
        </div>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-outline-variant/20 bg-surface-container-lowest">
              <tr>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">User</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Email</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Role</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Status</th>
                <th className="px-4 py-3 text-right text-xs uppercase text-on-surface-variant">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-on-surface">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{getRoleLabel(user.role)}</td>
                  <td className="px-4 py-3 text-sm">{user.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { setReplacementManagerId(""); setTarget(user); setNextRole(user.role); setSelectedPrakalpas(user.role === "prakalpa_manager" ? assignmentNames(user) : []); }}
                      disabled={saving || (!isSuperAdmin && user.role === "super_admin")}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-primary enabled:hover:bg-primary/5 disabled:opacity-40"
                    >
                      Change role
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">No matching users.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isSuperAdmin && <section>
        <h2 className="mb-4 font-headline-sm text-on-surface">Administrative activity</h2>
        {logError && <p role="alert" className="mb-3 text-sm text-error">{logError}</p>}
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-white shadow-sm">
          <table className="w-full min-w-[750px] text-left">
            <thead className="border-b border-outline-variant/20 bg-surface-container-lowest">
              <tr>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">When</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Actor</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Target</th>
                <th className="px-4 py-3 text-xs uppercase text-on-surface-variant">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{new Date(log.occurredAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{log.actor.name}</td>
                  <td className="px-4 py-3 text-sm">{log.target.name} <span className="text-on-surface-variant">({log.target.entityType === "role" ? "Role definition" : log.target.email})</span></td>
                  <td className="px-4 py-3 text-sm">
                    <span className="block font-medium">{log.action.replace(/_/g, " ")}</span>
                    {formatChange(log.oldValue)} <span aria-hidden="true">→</span> {formatChange(log.newValue)}
                  </td>
                </tr>
              ))}
              {!logError && logs.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-on-surface-variant">No administrative changes recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>}

      {target && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="role-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="role-confirm-title" className="font-headline-sm font-bold text-on-surface">Confirm role change</h2>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Change <strong>{target.name}</strong> from <strong>{getRoleLabel(target.role)}</strong> to:
            </p>
            <select
              aria-label="New role"
              value={nextRole}
              onChange={(event) => setNextRole(event.target.value as Role)}
              className="mt-3 w-full rounded-lg border border-outline-variant bg-white px-3 py-2"
            >
              {ROLE_OPTIONS.filter((role) => role !== "super_admin" || isSuperAdmin).map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
            </select>
            {nextRole === "prakalpa_manager" && <PrakalpaAssignments managers={users} userId={target.id} key={target.id} value={selectedPrakalpas} onChange={setSelectedPrakalpas} onReady={setAssignmentsReady} />}
            {target.role === "prakalpa_manager" && target.active && <select aria-label="Role change replacement Manager" value={replacementManagerId} onChange={event => setReplacementManagerId(event.target.value)} className="mt-3 w-full rounded-lg border px-3 py-2">
              <option value="">No transfer — preserve current coverage</option>
              {users.filter(user => user.active && user.role === "prakalpa_manager" && user.id !== target.id).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setTarget(null)} disabled={saving} className="rounded-lg border border-outline-variant px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={() => void saveRole()} disabled={saving || (nextRole === target.role && (nextRole !== "prakalpa_manager" || JSON.stringify(selectedPrakalpas) === JSON.stringify(assignmentNames(target)))) || (nextRole === "prakalpa_manager" && (!assignmentsReady || (target.active && !selectedPrakalpas.length)))} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50">
                {saving ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
