import { useState } from "react";
import { Link, useLocation } from "wouter";
import { clsx } from "clsx";
import { useApp } from "../context/app-context";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard",        icon: "dashboard",             roles: ["lead_auditor", "audit_coordinator", "auditor", "prakalpa_manager", "admin"] },
  { label: "Audit Plan",       href: "/audit-plan",       icon: "event_note",            roles: ["lead_auditor", "admin"] },
  { label: "Audit Calendar",   href: "/audit-calendar",   icon: "calendar_month",        roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
  { label: "Scheduled Audits", href: "/scheduled-audits", icon: "pending_actions",       roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
  { label: "All Reports",      href: "/all-reports",      icon: "fact_check",            roles: ["lead_auditor", "audit_coordinator", "prakalpa_manager", "admin"] },
  { label: "Open Reports",     href: "/open-reports",     icon: "inbox",                 roles: ["lead_auditor", "audit_coordinator", "prakalpa_manager", "auditor", "admin"] },
  { label: "Checklist",        href: "/checklist",        icon: "checklist",             roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
  { label: "IQA Summary",      href: "/iqa-summary",      icon: "summarize",             roles: ["lead_auditor", "audit_coordinator", "admin"] },
  { label: "User Management",  href: "/user-management",  icon: "manage_accounts",      roles: ["admin"] },
  { label: "Role Access",      href: "/role-access",      icon: "admin_panel_settings", roles: ["lead_auditor", "admin"] },
];

export const ROLE_LABELS: Record<string, string> = {
  admin:             "Admin",
  lead_auditor:      "Lead Auditor",
  audit_coordinator: "Audit Coordinator",
  auditor:           "Auditor",
  prakalpa_manager:  "Manager",
};

export function SideNav() {
  const [pathname, setLocation] = useLocation();
  const { currentUser } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.clear();
      sessionStorage.clear();
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      setLocation("/login");
    }, 1000);
  };

  const visible = navItems.filter((item) => item.roles.includes(currentUser?.role || ""));
  const roleLabel = ROLE_LABELS[currentUser?.role] ?? currentUser?.role ?? "User";

  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "U";

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-secondary shadow-md flex flex-col py-6 z-50">
        <div className="px-5 mb-6">
          <h1 className="font-headline-md font-bold text-on-secondary">Pratibimba</h1>
          <p className="font-label-md text-on-secondary/60 uppercase tracking-widest mt-0.5 text-[10px]">IQA Management</p>
          <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px] shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-on-secondary font-label-md font-bold truncate text-[12px]">{currentUser?.name}</p>
              <p className="text-on-secondary/60 text-[10px] font-medium">{roleLabel}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {visible.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150",
                  isActive
                    ? "bg-white/20 text-on-secondary font-bold border-l-[3px] border-primary-fixed-dim"
                    : "text-on-secondary/70 font-medium hover:bg-white/10 hover:text-on-secondary"
                )}
              >
                <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                <span className="font-label-md text-[13px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Universal Logout Button */}
        <div className="px-3 mt-auto pt-4 border-t border-white/10">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-2.5 bg-red-600/80 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-md text-[13px]"
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Confirmation & Buffer Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-150">
            {isLoggingOut ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="font-headline-sm font-bold text-on-surface">Logging out...</h3>
                <p className="text-on-surface-variant/70 text-xs mt-1">Clearing your session safely.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 text-red-600 mb-3">
                  <span className="material-symbols-outlined text-2xl">logout</span>
                  <h3 className="font-headline-sm font-bold text-on-surface">Confirm Logout</h3>
                </div>
                <p className="text-on-surface-variant text-sm mb-6">
                  Are you sure you want to log out of Pratibimba?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-black/5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Yes, Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
