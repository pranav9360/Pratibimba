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
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", roles: ["chief_auditor", "auditor"] },
  { label: "Audit Plan", href: "/audit-plan", icon: "event_note", roles: ["chief_auditor", "auditor"] },
  { label: "Scheduled Audits", href: "/scheduled-audits", icon: "calendar_month", roles: ["chief_auditor", "auditor"] },
  { label: "All Reports", href: "/all-reports", icon: "fact_check", roles: ["chief_auditor", "auditor", "prakalpa_manager"] },
  { label: "Open Reports", href: "/open-reports", icon: "inbox", roles: ["chief_auditor", "auditor", "prakalpa_manager"] },
  { label: "IQA Summary", href: "/iqa-summary", icon: "summarize", roles: ["chief_auditor", "auditor"] },
];

export function SideNav() {
  const [pathname] = useLocation();
  const { currentUser } = useApp();

  const visibleItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  const roleLabel = {
    chief_auditor: "Chief Auditor",
    auditor: "Auditor",
    prakalpa_manager: "Prakalpa Manager",
  }[currentUser.role];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-secondary shadow-md flex flex-col py-6 z-50">
      <div className="px-6 mb-8">
        <h1 className="font-headline-md font-bold text-on-secondary">Pratibimba</h1>
        <p className="font-label-md text-on-secondary/60 uppercase tracking-widest mt-0.5">IQA Management</p>
        <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-[10px]">
            {currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-on-secondary font-label-md font-bold truncate">{currentUser.name}</p>
            <p className="text-on-secondary/60 text-[10px] font-medium">{roleLabel}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-150",
                isActive
                  ? "bg-white/15 text-on-secondary font-bold border-l-4 border-primary-fixed-dim"
                  : "text-on-secondary/70 font-medium hover:bg-white/8 hover:text-on-secondary"
              )}
            >
              <span className={clsx("material-symbols-outlined text-[20px]", isActive && "filled")}>{item.icon}</span>
              <span className="font-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {currentUser.role === "chief_auditor" && (
        <div className="px-4 mt-auto pt-4">
          <Link
            href="/audit-plan"
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-lg text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Audit Plan
          </Link>
        </div>
      )}

      {currentUser.role === "prakalpa_manager" && currentUser.prakalpa && (
        <div className="px-4 mt-auto pt-4">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
            <p className="text-on-secondary/60 text-[10px] uppercase tracking-wider">Your Prakalpa</p>
            <p className="text-on-secondary font-label-md font-bold">{currentUser.prakalpa}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
