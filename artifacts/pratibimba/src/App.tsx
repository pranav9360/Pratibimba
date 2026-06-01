import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import LoginPage from "./pages/login";
import ForgotPasswordPage from "./pages/forgot-password";
import OTPVerificationPage from "./pages/otp-verification";
import ResetPasswordPage from "./pages/reset-password";
import DashboardPage from "./pages/dashboard";
import AuditLogsPage from "./pages/audits";
import AuditDetailPage from "./pages/audit-detail";
import NewAuditPage from "./pages/new-audit";
import AuditSuccessPage from "./pages/audit-success";
import VerificationQueuePage from "./pages/verification";
import ReportsPage from "./pages/reports";
import NotificationsPage from "./pages/notifications";
import UsersPage from "./pages/users";
import SettingsPage from "./pages/settings";
import CompliancePage from "./pages/compliance";
import { Link } from "wouter";
import { SideNav } from "./components/side-nav";
import { TopNav } from "./components/top-nav";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream-bg">
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-headline-md font-bold text-primary">Pratibimba</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="/help" className="text-on-surface-variant font-label-md cursor-pointer hover:text-primary transition-colors">
              Help & Support
            </a>
          </div>
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
          <span className="font-label-md text-on-surface-variant">&copy; 2024 Rashtrotthana Group. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="font-label-md text-on-surface-variant hover:text-secondary transition-colors">Privacy Policy</a>
            <a href="/security" className="font-label-md text-on-surface-variant hover:text-secondary transition-colors">Security Audit</a>
            <a href="/compliance" className="font-label-md text-on-surface-variant hover:text-secondary transition-colors">Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-bg">
      <SideNav />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNav />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-bg gap-4">
      <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30">search_off</span>
      <h1 className="font-headline-md text-on-surface">Page Not Found</h1>
      <p className="font-body-md text-on-surface-variant">The page you're looking for doesn't exist.</p>
      <Link href="/dashboard" className="mt-4 px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">
        Go to Dashboard
      </Link>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>

      {/* Auth routes */}
      <Route path="/login">
        <AuthLayout><LoginPage /></AuthLayout>
      </Route>
      <Route path="/forgot-password">
        <AuthLayout><ForgotPasswordPage /></AuthLayout>
      </Route>
      <Route path="/otp-verification">
        <AuthLayout><OTPVerificationPage /></AuthLayout>
      </Route>
      <Route path="/reset-password">
        <AuthLayout><ResetPasswordPage /></AuthLayout>
      </Route>

      {/* Dashboard routes */}
      <Route path="/dashboard">
        <DashboardLayout><DashboardPage /></DashboardLayout>
      </Route>
      <Route path="/audits/new">
        <DashboardLayout><NewAuditPage /></DashboardLayout>
      </Route>
      <Route path="/audits/success">
        <DashboardLayout><AuditSuccessPage /></DashboardLayout>
      </Route>
      <Route path="/audits/:id">
        <DashboardLayout><AuditDetailPage /></DashboardLayout>
      </Route>
      <Route path="/audits">
        <DashboardLayout><AuditLogsPage /></DashboardLayout>
      </Route>
      <Route path="/verification">
        <DashboardLayout><VerificationQueuePage /></DashboardLayout>
      </Route>
      <Route path="/reports">
        <DashboardLayout><ReportsPage /></DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout><NotificationsPage /></DashboardLayout>
      </Route>
      <Route path="/users">
        <DashboardLayout><UsersPage /></DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout><SettingsPage /></DashboardLayout>
      </Route>
      <Route path="/compliance">
        <DashboardLayout><CompliancePage /></DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
