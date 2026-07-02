import { useState } from "react";
import { useApp, LEAD_AUDITOR_PROFILES, DOMAINS, type Role, type RolePermission } from "../context/app-context";

const ROLE_META: Record<Role, { label: string; color: string; icon: string; description: string }> = {
  admin:             { label: "Admin",             color: "text-error",              icon: "shield_person",         description: "Full platform administration — manages users, roles, and access." },
  lead_auditor:      { label: "Lead Auditor",      color: "text-primary",            icon: "manage_accounts",       description: "Oversees audit planning, assigns coordinators and auditors to plans." },
  audit_coordinator: { label: "Audit Coordinator", color: "text-tertiary",           icon: "group_work",            description: "Leads field audit teams. Takes a team of auditors to the audit site." },
  auditor:           { label: "Auditor",           color: "text-secondary",          icon: "person_search",         description: "Part of the field audit team. Files audit reports and findings." },
  prakalpa_manager:  { label: "Prakalpa Manager",  color: "text-on-surface-variant", icon: "supervised_user_circle",description: "Domain unit manager with access to their domain's reports and corrective actions." },
};

const PERMISSION_LABELS: Record<keyof Omit<RolePermission, "role">, string> = {
  canCreateAuditPlan: "Create Audit Plans",
  canScheduleAudit:   "Schedule Audits",
  canEditReport:      "Edit Reports",
  canCloseReport:     "Close Reports",
  canViewAllReports:  "View All Reports",
  canManageRoles:     "Manage Role Permissions",
  canManageUsers:     "Manage Users",
  canViewDashboard:   "View Dashboard",
  canAddAuditor:      "Add New Auditors",
};

export default function RoleAccessPage() {
  const { currentUser, rolePermissions, updateRolePermission, leadAuditorProfiles, updateLeadAuditorProfile } = useApp();
  const canAccess = currentUser.role === "lead_auditor" || currentUser.role === "admin";
  const [editingLA, setEditingLA] = useState<string | null>(null);
  const [laEditDomains, setLaEditDomains] = useState<string[]>([]);

  const allPermissions = Object.keys(PERMISSION_LABELS) as Array<keyof Omit<RolePermission, "role">>;
  const roles: Role[] = ["admin", "lead_auditor", "audit_coordinator", "auditor", "prakalpa_manager"];

  if (!canAccess) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl shadow-soft border border-outline-variant/10 p-10 text-center space-y-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">lock</span>
          <h2 className="font-headline-md text-on-surface">Access Restricted</h2>
          <p className="font-body-md text-on-surface-variant">Only Lead Auditors and Admins can manage role permissions.</p>
        </div>
      </div>
    );
  }

  const startEditLA = (id: string) => {
    const la = leadAuditorProfiles.find((x) => x.id === id);
    if (!la) return;
    setEditingLA(id);
    setLaEditDomains([...la.domains]);
  };

  const toggleLaDomain = (domain: string) => {
    setLaEditDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]);
  };

  const saveLaDomains = () => {
    if (!editingLA) return;
    updateLeadAuditorProfile(editingLA, { domains: laEditDomains });
    setEditingLA(null);
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="font-headline-md text-on-surface">Role Access Management</h2>
        <p className="font-body-md text-on-surface-variant mt-0.5">Configure what each role can do within the system.</p>
      </div>

      {/* Role Overview Cards */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">Role Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map((role) => {
            const meta = ROLE_META[role];
            const perms = rolePermissions[role];
            const enabledCount = allPermissions.filter((p) => perms[p]).length;
            return (
              <div key={role} className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className={`material-symbols-outlined text-[19px] ${meta.color}`}>{meta.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className={`font-label-md font-bold text-[12px] ${meta.color}`}>{meta.label}</p>
                    <p className="font-label-md text-on-surface-variant/60 text-[10px]">{enabledCount}/{allPermissions.length} permissions</p>
                  </div>
                </div>
                <p className="font-body-md text-on-surface-variant/70 text-[11px] leading-relaxed">{meta.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permission Matrix */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">Permission Matrix</h3>
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  <th className="px-5 py-3 font-label-md text-on-surface-variant uppercase tracking-wider w-52 text-[11px]">Permission</th>
                  {roles.map((role) => {
                    const meta = ROLE_META[role];
                    return (
                      <th key={role} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`material-symbols-outlined text-[18px] ${meta.color}`}>{meta.icon}</span>
                          <span className={`font-label-md text-[10px] font-bold uppercase tracking-wider ${meta.color} whitespace-nowrap`}>{meta.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {allPermissions.map((perm, idx) => (
                  <tr key={perm} className={idx % 2 === 1 ? "bg-surface-container-lowest/40" : ""}>
                    <td className="px-5 py-3 font-label-md text-on-surface text-[12px]">{PERMISSION_LABELS[perm]}</td>
                    {roles.map((role) => {
                      const value = rolePermissions[role][perm];
                      return (
                        <td key={role} className="px-3 py-3 text-center">
                          <button
                            onClick={() => updateRolePermission(role, { [perm]: !value })}
                            className={`w-9 h-5 rounded-full transition-all duration-200 relative flex items-center mx-auto ${value ? "bg-primary justify-end" : "bg-surface-container-high justify-start"}`}
                            title={`${value ? "Disable" : "Enable"} ${PERMISSION_LABELS[perm]} for ${ROLE_META[role].label}`}
                          >
                            <span className={`w-4 h-4 rounded-full shadow-sm mx-0.5 transition-all ${value ? "bg-on-primary" : "bg-on-surface-variant/40"}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Lead Auditor Domain Assignments */}
      <section>
        <h3 className="font-headline-sm text-on-surface mb-4">Lead Auditor Domain Assignments</h3>
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="divide-y divide-outline-variant/10">
            {leadAuditorProfiles.map((la) => (
              <div key={la.id} className="p-5">
                {editingLA === la.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[12px]">
                        {la.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-label-md font-bold text-on-surface">{la.name}</p>
                        <p className="font-label-md text-on-surface-variant/60 text-[11px]">{la.email}</p>
                      </div>
                    </div>
                    <p className="font-label-md text-on-surface-variant/70 text-[12px]">Select domains to assign:</p>
                    <div className="flex flex-wrap gap-2">
                      {DOMAINS.map((d) => (
                        <button key={d} type="button" onClick={() => toggleLaDomain(d)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${laEditDomains.includes(d) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setEditingLA(null)} className="px-4 py-2 border border-outline-variant rounded-lg font-label-md text-[12px] hover:bg-surface-container-low">Cancel</button>
                      <button onClick={saveLaDomains} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold text-[12px]">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[12px] shrink-0">
                        {la.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-label-md font-bold text-on-surface">{la.name}</p>
                        <p className="font-label-md text-on-surface-variant/60 text-[11px]">{la.email}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {la.domains.length === 0 ? (
                            <span className="text-[11px] text-on-surface-variant/50 italic">No domains assigned</span>
                          ) : la.domains.map((d) => (
                            <span key={d} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => startEditLA(la.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg font-label-md text-[12px] hover:bg-surface-container-low">
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      Edit Domains
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
