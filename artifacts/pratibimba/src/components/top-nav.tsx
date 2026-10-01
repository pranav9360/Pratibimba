import { useLocation } from "wouter";
import { useState } from "react";
import { useApp } from "../context/app-context";

const breadcrumbMap: Record<string, string> = {
  "/dashboard":       "Dashboard",
  "/audit-plan":      "Audit Plan",
  "/audit-calendar":  "Audit Calendar",
  "/scheduled-audits":"Scheduled Audits",
  "/all-reports":     "All Reports",
  "/open-reports":    "Open Reports",
  "/iqa-summary":     "IQA Summary",
  "/role-access":     "Role Access",
  "/user-management": "User Management",
  "/prakalpa-management": "Prakalpa Management",
};

export const ROLE_LABELS: Record<string, string> = {
  admin:             "Admin",
  lead_auditor:      "Lead Auditor",
  audit_coordinator: "Audit Coordinator",
  auditor:           "Auditor",
  prakalpa_manager:  "Manager",
};

const ROLE_BADGE: Record<string, string> = {
  admin:             "bg-error/10 text-error",
  lead_auditor:      "bg-primary/10 text-primary",
  audit_coordinator: "bg-tertiary/10 text-tertiary",
  auditor:           "bg-secondary/10 text-secondary",
  prakalpa_manager:  "bg-surface-container text-on-surface-variant",
};

export function TopNav() {
  const [pathname, setLocation] = useLocation();
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const breadcrumbs = (() => {
    if (!pathname) return [];
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = breadcrumbMap[currentPath] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label, href: currentPath });
    }
    return crumbs;
  })();

  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;
  const roleBadge = ROLE_BADGE[currentUser.role] ?? "bg-surface-container text-on-surface-variant";

  return (
    <header className="sticky top-0 z-40 w-full min-h-16 bg-surface border-b border-outline-variant/20 flex justify-between items-center px-3 sm:px-4 md:px-8">
      <div className="flex items-center min-w-0 gap-2">
        <button
          type="button"
          onClick={() => {
            setShowMobileMenu((s) => !s);
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
          className="md:hidden shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined text-[24px]">
            {showMobileMenu ? "close" : "menu"}
          </span>
        </button>

        <nav className="flex items-center min-w-0 font-label-md text-on-surface-variant overflow-hidden">
        {breadcrumbs.map((crumb, idx) => (
          <span key={crumb.href} className="flex items-center">
            {idx > 0 && <span className="material-symbols-outlined text-sm mx-1.5 text-on-surface-variant/40">chevron_right</span>}
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-primary font-bold">{crumb.label}</span>
            ) : (
              <span className="text-on-surface-variant/60">{crumb.label}</span>
            )}
          </span>
        ))}
        </nav>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        <span className={`hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadge}`}>
          {roleLabel}
        </span>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications((s) => !s); setShowUserMenu(false); }}
            className="relative p-2 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-xl shadow-floating border border-outline-variant/20 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-lowest flex justify-between items-center">
                  <p className="font-label-md text-on-surface font-bold">Notifications</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-[11px] text-primary hover:underline font-label-md">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant/50 font-body-md">No notifications</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/10">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex gap-3 items-start">
                          <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${n.type === "mail" ? "text-secondary" : n.type === "warning" ? "text-error" : "text-primary"}`}>
                            {n.type === "mail" ? "mail" : n.type === "warning" ? "warning" : "info"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-label-md ${!n.read ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>{n.title}</p>
                            <p className="font-label-md text-on-surface-variant/70 text-[11px] mt-0.5 leading-snug">{n.message}</p>
                            <p className="font-data-mono text-[10px] text-on-surface-variant/50 mt-1">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Authenticated User Identity */}
        <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[11px]">
            {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>

          <div className="hidden lg:block text-left">
            <p className="font-label-md font-bold text-on-surface leading-tight">
              {currentUser.name}
            </p>

            <p className="text-[10px] text-on-surface-variant/60">
              {roleLabel}
            </p>
          </div>

          <span
            className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${roleBadge}`}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {showMobileMenu && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="md:hidden fixed inset-0 top-16 bg-black/30 z-40"
            onClick={() => setShowMobileMenu(false)}
          />

          <div className="md:hidden fixed left-0 right-0 top-16 z-50 bg-secondary shadow-xl border-t border-white/10 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-3 space-y-1">
              {[
                { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ["lead_auditor", "audit_coordinator", "auditor", "prakalpa_manager", "admin"] },
                { label: "Audit Plan", href: "/audit-plan", icon: "event_note", roles: ["admin", "audit_coordinator"] },
                { label: "Audit Calendar", href: "/audit-calendar", icon: "calendar_month", roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
                { label: "Scheduled Audits", href: "/scheduled-audits", icon: "pending_actions", roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
                { label: "My Findings", href: "/my-findings", icon: "assignment", roles: ["auditor"] },
                { label: "Review Findings", href: "/lead-findings", icon: "assignment", roles: ["lead_auditor"] },
                { label: "Generate IQR", href: "/coordinator-findings", icon: "post_add", roles: ["audit_coordinator"] },
                { label: "All Reports", href: "/all-reports", icon: "fact_check", roles: ["lead_auditor", "audit_coordinator", "prakalpa_manager", "admin"] },
                { label: "Open Reports", href: "/open-reports", icon: "inbox", roles: ["lead_auditor", "audit_coordinator", "prakalpa_manager", "auditor", "admin"] },
                { label: "Checklist", href: "/checklist", icon: "checklist", roles: ["lead_auditor", "audit_coordinator", "auditor", "admin"] },
                { label: "IQA Summary", href: "/iqa-summary", icon: "summarize", roles: ["lead_auditor", "audit_coordinator", "admin"] },
                { label: "Prakalpa Management", href: "/prakalpa-management", icon: "account_tree", roles: ["super_admin", "admin"] },
                { label: "User Management", href: "/user-management", icon: "manage_accounts", roles: ["super_admin", "admin"] },
                { label: "Role Access", href: "/role-access", icon: "admin_panel_settings", roles: ["lead_auditor", "admin"] },
              ]
                .filter((item) => item.roles.includes(currentUser?.role || ""))
                .map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`);

                  return (
                    <button
                      type="button"
                      key={item.href}
                      onClick={() => {
                        setShowMobileMenu(false);
                        setLocation(item.href);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        active
                          ? "bg-white/20 text-on-secondary font-bold"
                          : "text-on-secondary/80 hover:bg-white/10"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>

                      <span className="font-label-md text-[13px]">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
