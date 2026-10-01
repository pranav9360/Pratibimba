import type { ReactNode } from "react";
import { useApp } from "../context/app-context";

type RoleRouteGuardProps = {
  children: ReactNode;
  allowedRoles: readonly string[];
};

/*
 * Frontend route-level authorization guard.
 *
 * IMPORTANT:
 * This improves UI/navigation enforcement only.
 * Backend authorization remains the security authority.
 */
export function RoleRouteGuard({
  children,
  allowedRoles,
}: RoleRouteGuardProps) {
  const { currentUser } = useApp();

  const role =
    currentUser?.role || "";

  const allowed =
    allowedRoles.includes(role);

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-3xl">
              lock
            </span>
          </div>

          <h1 className="font-headline-md font-bold text-on-surface mb-2">
            Access Restricted
          </h1>

          <p className="font-body-md text-on-surface-variant mb-6">
            Your current role does not have permission to access this page.
          </p>

          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>

            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
