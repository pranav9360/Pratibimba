import { useLocation } from "wouter";
import { useState } from "react";
import { useApp, DEMO_USERS } from "../context/app-context";

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

const ROLE_GROUP_ORDER: string[] = ["admin", "lead_auditor", "audit_coordinator", "auditor", "prakalpa_manager"];

export function TopNav() {
  const [pathname] = useLocation();
  const { currentUser, setCurrentUser, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Group demo users by role for display
  const sortedDemoUsers = [...DEMO_USERS].sort(
    (a, b) => ROLE_GROUP_ORDER.indexOf(a.role) - ROLE_GROUP_ORDER.indexOf(b.role)
  );

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-surface border-b border-outline-variant/20 flex justify-between items-center px-8">
      <nav className="flex items-center font-label-md text-on-surface-variant">
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

      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadge}`}>
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
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-floating border border-outline-variant/20 z-50 overflow-hidden">
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

        {/* User Switcher */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu((s) => !s); setShowNotifications(false); }}
            className="flex items-center gap-2 hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[11px]">
              {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="hidden lg:block text-left">
              <p className="font-label-md font-bold text-on-surface leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-on-surface-variant/60">Switch role</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">expand_more</span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-floating border border-outline-variant/20 z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
                <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-lowest sticky top-0">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-[11px]">Switch Demo User</p>
                </div>
                {sortedDemoUsers.map((user) => {
                  const label = ROLE_LABELS[user.role] ?? user.role;
                  const badge = ROLE_BADGE[user.role] ?? "bg-surface-container text-on-surface-variant";
                  const isActive = currentUser.id === user.id;
                  const sub = user.domain ?? "";
                  return (
                    <button
                      key={user.id}
                      onClick={() => { setCurrentUser(user); setShowUserMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left ${isActive ? "bg-surface-container" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[11px] shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md font-bold text-on-surface text-[12px]">{user.name}</p>
                        {sub && <p className="text-[10px] text-on-surface-variant/70">{sub}</p>}
                        <p className="text-[10px] text-on-surface-variant/50 truncate">{user.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${badge}`}>{label}</span>
                      {isActive && <span className="material-symbols-outlined text-primary text-[16px]">check</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
