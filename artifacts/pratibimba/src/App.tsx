import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AppProvider } from "./context/app-context";
import { SideNav } from "./components/side-nav";
import { TopNav } from "./components/top-nav";
import { Link } from "wouter";

import LoginPage from "./pages/login";
import ForgotPasswordPage from "./pages/forgot-password";
import OTPVerificationPage from "./pages/otp-verification";
import ResetPasswordPage from "./pages/reset-password";

import DashboardPage from "./pages/dashboard";
import AuditPlanPage from "./pages/audit-plan";
import AuditCalendarPage from "./pages/audit-calendar";
import ScheduledAuditsPage from "./pages/scheduled-audits";
import AllReportsPage from "./pages/all-reports";
import OpenReportsPage from "./pages/open-reports";
import CreateReportPage from "./pages/create-report";
import IQASummaryPage from "./pages/iqa-summary";
import RoleAccessPage from "./pages/role-access";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream-bg">
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto">
          <span className="font-headline-md font-bold text-primary">Pratibimba</span>
          <a href="/help" className="text-on-surface-variant font-label-md hover:text-primary transition-colors">Help & Support</a>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center px-4 py-32 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
          <div className="absolute -bottom-[10%] -left-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
        </div>
        {children}
      </main>
      <footer className="w-full px-6 py-4 border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-label-md text-on-surface-variant">&copy; 2026 Rashtrotthana Group. All rights reserved.</span>
          <div className="flex gap-6">
            <span className="font-label-md text-on-surface-variant/60">Privacy Policy</span>
            <span className="font-label-md text-on-surface-variant/60">Security</span>
            <span className="font-label-md text-on-surface-variant/60">Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      <SideNav />
      <main className="ml-[240px] min-h-screen flex flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-bg gap-4">
      <span className="material-symbols-outlined text-[64px] text-on-surface-variant/20">search_off</span>
      <h1 className="font-headline-md text-on-surface">Page Not Found</h1>
      <Link href="/dashboard" className="mt-4 px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold">Go to Dashboard</Link>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/"><Redirect to="/login" /></Route>

      <Route path="/login"><AuthLayout><LoginPage /></AuthLayout></Route>
      <Route path="/forgot-password"><AuthLayout><ForgotPasswordPage /></AuthLayout></Route>
      <Route path="/otp-verification"><AuthLayout><OTPVerificationPage /></AuthLayout></Route>
      <Route path="/reset-password"><AuthLayout><ResetPasswordPage /></AuthLayout></Route>

      <Route path="/dashboard"><DashboardLayout><DashboardPage /></DashboardLayout></Route>
      <Route path="/audit-plan"><DashboardLayout><AuditPlanPage /></DashboardLayout></Route>
      <Route path="/audit-calendar"><DashboardLayout><AuditCalendarPage /></DashboardLayout></Route>
      <Route path="/scheduled-audits"><DashboardLayout><ScheduledAuditsPage /></DashboardLayout></Route>
      <Route path="/all-reports"><DashboardLayout><AllReportsPage /></DashboardLayout></Route>
      <Route path="/open-reports"><DashboardLayout><OpenReportsPage /></DashboardLayout></Route>
      <Route path="/create-report/:id"><DashboardLayout><CreateReportPage /></DashboardLayout></Route>
      <Route path="/iqa-summary"><DashboardLayout><IQASummaryPage /></DashboardLayout></Route>
      <Route path="/role-access"><DashboardLayout><RoleAccessPage /></DashboardLayout></Route>
      <Route path="/checklist"><DashboardLayout><div className="p-8"><h2 className="font-headline-md">Checklist — Coming Soon</h2></div></DashboardLayout></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AppProvider>
  );
}

export default App;
