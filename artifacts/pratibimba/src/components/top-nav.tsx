import { useLocation } from "wouter";
import { useState } from "react";
import { useApp, DEMO_USERS } from "../context/app-context";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/audit-plan": "Audit Plan",
  "/audit-plan/new": "New Audit Plan",
  "/scheduled-audits": "Scheduled Audits",
  "/all-reports": "All Reports",
  "/iqa-summary": "IQA Summary",
};

export function TopNav() {
  const [pathname] = useLocation();
  const { currentUser, setCurrentUser } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getBreadcrumbs = () => {
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
  };

  const breadcrumbs = getBreadcrumbs();

  const roleLabel = {
    chief_auditor: "Chief Auditor",
    auditor: "Auditor",
    prakalpa_manager: "Prakalpa Manager",
  }[currentUser.role];

  const roleBadgeColor = {
    chief_auditor: "bg-primary/10 text-primary",
    auditor: "bg-secondary/10 text-secondary",
    prakalpa_manager: "bg-tertiary/10 text-tertiary",
  }[currentUser.role];

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-surface border-b border-outline-variant/20 flex justify-between items-center px-8">
      <nav className="flex items-center font-label-md text-on-surface-variant">
        {breadcrumbs.map((crumb, idx) => (
          <span key={crumb.href} className="flex items-center">
            {idx > 0 && (
              <span className="material-symbols-outlined text-sm mx-1.5 text-on-surface-variant/40">chevron_right</span>
            )}
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-primary font-bold">{crumb.label}</span>
            ) : (
              <span className="text-on-surface-variant/60">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {/* Role indicator */}
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadgeColor}`}>
          {roleLabel}
        </span>

        {/* User switcher (demo) */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((s) => !s)}
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-floating border border-outline-variant/20 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/10 bg-surface-container-lowest">
                  <p className="font-label-md text-on-surface-variant uppercase tracking-wider">Switch Demo User</p>
                </div>
                {DEMO_USERS.map((user) => {
                  const label = {
                    chief_auditor: "Chief Auditor",
                    auditor: "Auditor",
                    prakalpa_manager: "Prakalpa Manager",
                  }[user.role];
                  const badge = {
                    chief_auditor: "bg-primary/10 text-primary",
                    auditor: "bg-secondary/10 text-secondary",
                    prakalpa_manager: "bg-tertiary/10 text-tertiary",
                  }[user.role];
                  const isActive = currentUser.name === user.name && currentUser.role === user.role;
                  return (
                    <button
                      key={`${user.role}-${user.name}`}
                      onClick={() => { setCurrentUser(user); setShowUserMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left ${isActive ? "bg-surface-container" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-[11px] shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md font-bold text-on-surface">{user.name}</p>
                        {user.prakalpa && <p className="text-[10px] text-on-surface-variant/70">{user.prakalpa}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badge}`}>{label}</span>
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
