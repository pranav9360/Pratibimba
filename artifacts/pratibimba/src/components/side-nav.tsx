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
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ["lead_auditor", "auditor", "ceo"] },
  { label: "Audit Plan", href: "/audit-plan", icon: "event_note", roles: ["lead_auditor", "auditor"] },
  { label: "Audit Calendar", href: "/audit-calendar", icon: "calendar_month", roles: ["lead_auditor", "auditor", "ceo"] },
  { label: "Scheduled Audits", href: "/scheduled-audits", icon: "pending_actions", roles: ["lead_auditor", "auditor"] },
  { label: "All Reports", href: "/all-reports", icon: "fact_check", roles: ["lead_auditor", "auditor", "prakalpa_manager", "ceo"] },
  { label: "Open Reports", href: "/open-reports", icon: "inbox", roles: ["lead_auditor", "auditor", "prakalpa_manager", "ceo"] },
  { label: "Checklist", href: "/checklist", icon: "checklist", roles: ["lead_auditor", "auditor"] },
  { label: "IQA Summary", href: "/iqa-summary", icon: "summarize", roles: ["lead_auditor", "auditor", "ceo"] },
  { label: "Role Access", href: "/role-access", icon: "admin_panel_settings", roles: ["lead_auditor"] },
];

const ROLE_LABELS: Record<string, string> = {
  lead_auditor: "Lead Auditor",
  auditor: "Auditor",
  prakalpa_manager: "Manager",
  ceo: "CEO",
};

export function SideNav() {
  const [pathname] = useLocation();
  const { currentUser } = useApp();

  const visible = navItems.filter((item) => item.roles.includes(currentUser.role));
  const roleLabel = ROLE_LABELS[currentUser.role] ?? currentUser.role;

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-secondary shadow-md flex flex-col py-6 z-50">
      <div className="px-5 mb-6">
        <h1 className="font-headline-md font-bold text-on-secondary">Pratibimba</h1>
        <p className="font-label-md text-on-secondary/60 uppercase tracking-widest mt-0.5 text-[10px]">IQA Management</p>
        <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px] shrink-0">
            {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-on-secondary font-label-md font-bold truncate text-[12px]">{currentUser.name}</p>
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

      {currentUser.role === "lead_auditor" && (
        <div className="px-3 mt-auto pt-4">
          <Link
            href="/audit-plan"
            className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg text-[13px]"
          >
            <span className="material-symbols-outlined text-[17px]">add</span>
            New Audit Plan
          </Link>
        </div>
      )}

      {currentUser.role === "prakalpa_manager" && currentUser.domain && (
        <div className="px-3 mt-auto pt-4">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-on-secondary/60 text-[10px] uppercase tracking-wider">Your Domain</p>
            <p className="text-on-secondary font-label-md font-bold text-[12px]">{currentUser.domain}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
