"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "analytics" },
  { label: "Audit Plan", href: "/dashboard/audit-plan", icon: "event_note" },
  { label: "Scheduled Audits", href: "/dashboard/scheduled-audits", icon: "calendar_today" },
  { label: "All Reports", href: "/dashboard/all-reports", icon: "assessment" },
  { label: "IQA Summary", href: "/dashboard/iqa-summary", icon: "summarize" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-secondary shadow-md flex flex-col py-6 z-50">
      {/* Brand */}
      <div className="px-6 mb-8">
        <h1 className="font-headline-md font-bold text-on-secondary">Pratibimba</h1>
        <p className="font-label-md text-on-secondary/70 uppercase tracking-widest mt-1">
          Audit Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-4 px-4 py-3 transition-colors duration-150 active:scale-95",
                isActive
                  ? "border-l-4 border-primary bg-white/10 text-on-secondary font-bold"
                  : "text-on-secondary/70 font-medium hover:bg-white/5"
              )}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md">{item.label}</span>
              {item.icon === "notifications" && (
                <span className="ml-auto w-2 h-2 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* New Audit Button */}
      <div className="px-6 mt-auto">
        <Link
          href="/dashboard/audit-plan"
          className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 duration-150 shadow-lg hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          <span className="font-label-md">New Audit Plan</span>
        </Link>
      </div>
    </aside>
  );
}
