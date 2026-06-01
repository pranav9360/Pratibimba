"use client";

import { Link, useLocation } from "wouter";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Audit Logs", href: "/audits", icon: "list_alt" },
  { label: "Submit Audit", href: "/audits/new", icon: "add_circle" },
  { label: "Verification Queue", href: "/verification", icon: "playlist_add_check" },
  { label: "Reports & Analytics", href: "/reports", icon: "analytics" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
  { label: "User Management", href: "/users", icon: "group" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function SideNav() {
  const [pathname] = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-secondary shadow-md flex flex-col py-6 z-50">
      <div className="px-6 mb-8">
        <h1 className="font-headline-md font-bold text-on-secondary">Pratibimba</h1>
        <p className="font-label-md text-on-secondary/70 uppercase tracking-widest mt-1">
          Audit Management
        </p>
      </div>

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

      <div className="px-6 mt-auto">
        <Link
          href="/audits/new"
          className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 duration-150 shadow-lg hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined">add</span>
          <span className="font-label-md">New Audit Request</span>
        </Link>
      </div>
    </aside>
  );
}
