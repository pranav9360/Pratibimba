"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/audits": "Audit Logs",
  "/audits/new": "New Audit Submission",
  "/verification": "Verification Queue",
  "/reports": "Reports & Analytics",
  "/notifications": "Notifications",
  "/users": "User Management",
  "/settings": "Settings",
  "/compliance": "Compliance & Reporting",
  "/timeline": "Process Timeline",
};

export function TopNav() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    if (!pathname) return [];
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [
      { label: "Home", href: "/dashboard" },
    ];

    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = breadcrumbMap[currentPath] || segment;
      crumbs.push({ label, href: currentPath });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const pageTitle =
    breadcrumbs.length > 1
      ? breadcrumbs[breadcrumbs.length - 1].label
      : "Dashboard";

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-surface shadow-sm flex justify-between items-center px-8">
      {/* Left Section - Breadcrumbs & Search */}
      <div className="flex items-center gap-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center font-label-md text-on-surface-variant">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.href} className="flex items-center">
              {idx > 0 && (
                <span className="material-symbols-outlined text-sm mx-2">
                  chevron_right
                </span>
              )}
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-primary font-bold">{crumb.label}</span>
              ) : (
                <span className="hover:text-primary cursor-pointer transition-colors">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Search */}
        <div className="relative w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
            search
          </span>
          <input
            type="text"
            placeholder="Search audits, files, or users..."
            className="w-full pl-10 pr-12 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-data-mono text-[10px] text-on-surface-variant/40 bg-surface-container-high px-1.5 py-0.5 rounded">
            Cmd+K
          </span>
        </div>
      </div>

      {/* Right Section - Actions & User */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-tertiary rounded-full" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low p-1.5 rounded-full transition-all">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAIpuL-U_ffphU8A-seDe9Ac5PK57PBY46gFlqVDNkpHP0EIvHfTZ-pbeiHpglpRHInbXE3CnrQ3a3mr8zPy4dbzMDRzsenvfiAho4h398LRfdKvDoZG1lub2x8U6xHjoYmU7IZ03R9AF13OA1X0LlmP1KUs3DBG7QkTpXNp25Jr_SC09qTNFBInhru9R8TRAKTrTG-Yj9Jvawsk8_tz75UTqMM6aGCiJbV1t8Lor5lSQAGd4Sfs92J1US4p35Do9w3vdFkM6JqBiT"
            alt="User Avatar"
            width={32}
            height={32}
            className="rounded-full bg-secondary-container"
          />
          <div className="hidden lg:block text-left pr-2">
            <p className="font-bold font-body-md leading-tight text-on-surface">
              Ananya Iyer
            </p>
            <p className="font-label-md text-on-surface-variant/70">
              Chief Auditor
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
