import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export const PRAKALPAS = [
  "Bengaluru Central",
  "Mumbai North",
  "Delhi East",
  "Pune West",
  "Hyderabad South",
  "Chennai Metro",
  "Kolkata West",
  "Ahmedabad East",
];

export const AUDITORS = [
  "Dr. Sarah Jenkins",
  "Vikram Singh",
  "Anita Rao",
  "Rohan Mehra",
  "Marcus Thorne",
  "Priya Nair",
];

export type Role = "chief_auditor" | "auditor" | "prakalpa_manager";

export interface CurrentUser {
  name: string;
  role: Role;
  auditorName?: string; // for auditor role
  prakalpa?: string; // for prakalpa_manager role
}

export interface AuditPlan {
  id: string;
  iqaNumber: string;
  expectedEndDate: string;
  probableAuditor: string;
  prakalpa: string;
  purpose: string;
  createdDate: string;
}

export interface ScheduledAudit {
  id: string;
  iqaNumber: string;
  startDate: string;
  endDate: string;
  finalAuditor: string;
  prakalpa: string;
  purpose: string;
  expectedEndDate: string;
  createdDate: string;
  scheduledDate: string;
}

export interface Report {
  id: string;
  iqrNumber: string;
  iqaNumber: string;
  prakalpa: string;
  auditor: string;
  visitDate: string;
  visitTime: string;
  createdDate: string;
  severity: "open_for_improvement" | "non_conformance";
  findings: string;
  proofFiles: string[];
  hasChecklist: boolean;
  status: "open" | "closed";
  actionTaken?: string;
}

function genIQA() {
  const n = Math.floor(1000000 + Math.random() * 8999999);
  return `IQA2026${n}`;
}

function genIQR() {
  const n = Math.floor(1000000 + Math.random() * 8999999);
  return `IQR2026${n}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function daysFuture(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Seed data
const seedPlans: AuditPlan[] = [
  {
    id: "plan-1",
    iqaNumber: "IQA20261842301",
    expectedEndDate: daysFuture(30),
    probableAuditor: "Dr. Sarah Jenkins",
    prakalpa: "Bengaluru Central",
    purpose: "Annual safety and compliance inspection for laboratory operations.",
    createdDate: daysAgo(5),
  },
  {
    id: "plan-2",
    iqaNumber: "IQA20265928174",
    expectedEndDate: daysFuture(45),
    probableAuditor: "Vikram Singh",
    prakalpa: "Mumbai North",
    purpose: "Quarterly financial records audit and documentation review.",
    createdDate: daysAgo(3),
  },
  {
    id: "plan-3",
    iqaNumber: "IQA20263710582",
    expectedEndDate: daysFuture(20),
    probableAuditor: "Anita Rao",
    prakalpa: "Pune West",
    purpose: "HR process compliance and employee welfare assessment.",
    createdDate: daysAgo(1),
  },
];

const seedScheduled: ScheduledAudit[] = [
  {
    id: "sched-1",
    iqaNumber: "IQA20267294835",
    startDate: daysAgo(2),
    endDate: daysFuture(5),
    finalAuditor: "Rohan Mehra",
    prakalpa: "Hyderabad South",
    purpose: "Vendor procurement compliance check — Q3 2026.",
    expectedEndDate: daysFuture(7),
    createdDate: daysAgo(10),
    scheduledDate: daysAgo(2),
  },
  {
    id: "sched-2",
    iqaNumber: "IQA20264018263",
    startDate: daysAgo(5),
    endDate: daysFuture(2),
    finalAuditor: "Dr. Sarah Jenkins",
    prakalpa: "Chennai Metro",
    purpose: "IT infrastructure security review and data governance audit.",
    expectedEndDate: daysFuture(3),
    createdDate: daysAgo(15),
    scheduledDate: daysAgo(5),
  },
  {
    id: "sched-3",
    iqaNumber: "IQA20269483021",
    startDate: daysFuture(3),
    endDate: daysFuture(10),
    finalAuditor: "Marcus Thorne",
    prakalpa: "Delhi East",
    purpose: "Annual operational process review and quality assurance.",
    expectedEndDate: daysFuture(12),
    createdDate: daysAgo(7),
    scheduledDate: daysAgo(1),
  },
];

const seedReports: Report[] = [
  {
    id: "rep-1",
    iqrNumber: "IQR20261837492",
    iqaNumber: "IQA20267294835",
    prakalpa: "Hyderabad South",
    auditor: "Rohan Mehra",
    visitDate: daysAgo(1),
    visitTime: "10:30 AM",
    createdDate: daysAgo(1),
    severity: "non_conformance",
    findings: "Vendor documentation missing for 3 contracts. Financial reconciliation shows discrepancies in petty cash register for March and April. Purchase orders not approved by designated authority for items above ₹50,000.",
    proofFiles: ["vendor_contracts_scan.pdf", "petty_cash_report.xlsx"],
    hasChecklist: true,
    status: "open",
  },
  {
    id: "rep-2",
    iqrNumber: "IQR20268204736",
    iqaNumber: "IQA20264018263",
    prakalpa: "Chennai Metro",
    auditor: "Dr. Sarah Jenkins",
    visitDate: daysAgo(3),
    visitTime: "02:15 PM",
    createdDate: daysAgo(3),
    severity: "open_for_improvement",
    findings: "IT asset register partially updated. Server room access logs not maintained consistently. Recommend implementing automated access tracking system.",
    proofFiles: ["server_room_photos.jpg"],
    hasChecklist: false,
    status: "open",
    actionTaken: "Implementing biometric access system by end of month. Asset register being updated by IT team.",
  },
  {
    id: "rep-3",
    iqrNumber: "IQR20269374820",
    iqaNumber: "IQA20267294835",
    prakalpa: "Hyderabad South",
    auditor: "Rohan Mehra",
    visitDate: daysAgo(35),
    visitTime: "11:00 AM",
    createdDate: daysAgo(35),
    severity: "non_conformance",
    findings: "Safety equipment not maintained as per OSHA standards. Fire extinguisher inspection overdue by 6 months. Emergency exit blocked.",
    proofFiles: ["safety_inspection_photos.zip"],
    hasChecklist: true,
    status: "open",
  },
  {
    id: "rep-4",
    iqrNumber: "IQR20262938471",
    iqaNumber: "IQA20264018263",
    prakalpa: "Chennai Metro",
    auditor: "Dr. Sarah Jenkins",
    visitDate: daysAgo(60),
    visitTime: "09:45 AM",
    createdDate: daysAgo(60),
    severity: "open_for_improvement",
    findings: "Minor gaps in employee training documentation. Recommend mandatory quarterly training records.",
    proofFiles: [],
    hasChecklist: false,
    status: "closed",
    actionTaken: "Training records system implemented. All staff updated.",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextType {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;

  auditPlans: AuditPlan[];
  scheduledAudits: ScheduledAudit[];
  reports: Report[];

  createAuditPlan: (data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">) => AuditPlan;
  updateAuditPlan: (id: string, data: Partial<AuditPlan>) => void;
  deleteAuditPlan: (id: string) => void;
  scheduleAudit: (planId: string, data: Pick<ScheduledAudit, "startDate" | "endDate" | "finalAuditor">) => void;
  updateScheduledAudit: (id: string, data: Partial<ScheduledAudit>) => void;

  createReport: (data: Omit<Report, "id" | "iqrNumber" | "createdDate" | "status">) => Report;
  updateReport: (id: string, data: Partial<Report>) => void;
  addActionTaken: (id: string, action: string) => void;
  closeReport: (id: string) => void;

  getDaysOpen: (report: Report) => number;
  isRedFlagged: (report: Report) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const DEMO_USERS: CurrentUser[] = [
  { name: "Ananya Iyer", role: "chief_auditor" },
  { name: "Dr. Sarah Jenkins", role: "auditor", auditorName: "Dr. Sarah Jenkins" },
  { name: "Rohan Mehra", role: "auditor", auditorName: "Rohan Mehra" },
  { name: "Ravi Kumar", role: "prakalpa_manager", prakalpa: "Hyderabad South" },
  { name: "Meena Sharma", role: "prakalpa_manager", prakalpa: "Chennai Metro" },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEMO_USERS[0]);
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>(seedPlans);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>(seedScheduled);
  const [reports, setReports] = useState<Report[]>(seedReports);

  const createAuditPlan = useCallback((data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">): AuditPlan => {
    const plan: AuditPlan = {
      id: `plan-${Date.now()}`,
      iqaNumber: genIQA(),
      createdDate: new Date().toISOString().split("T")[0],
      ...data,
    };
    setAuditPlans((prev) => [plan, ...prev]);
    return plan;
  }, []);

  const updateAuditPlan = useCallback((id: string, data: Partial<AuditPlan>) => {
    setAuditPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deleteAuditPlan = useCallback((id: string) => {
    setAuditPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const scheduleAudit = useCallback((planId: string, data: Pick<ScheduledAudit, "startDate" | "endDate" | "finalAuditor">) => {
    setAuditPlans((prev) => {
      const plan = prev.find((p) => p.id === planId);
      if (!plan) return prev;
      const scheduled: ScheduledAudit = {
        id: `sched-${Date.now()}`,
        iqaNumber: plan.iqaNumber,
        prakalpa: plan.prakalpa,
        purpose: plan.purpose,
        expectedEndDate: plan.expectedEndDate,
        createdDate: plan.createdDate,
        scheduledDate: new Date().toISOString().split("T")[0],
        ...data,
      };
      setScheduledAudits((s) => [scheduled, ...s]);
      return prev.filter((p) => p.id !== planId);
    });
  }, []);

  const updateScheduledAudit = useCallback((id: string, data: Partial<ScheduledAudit>) => {
    setScheduledAudits((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  const createReport = useCallback((data: Omit<Report, "id" | "iqrNumber" | "createdDate" | "status">): Report => {
    const report: Report = {
      id: `rep-${Date.now()}`,
      iqrNumber: genIQR(),
      createdDate: new Date().toISOString().split("T")[0],
      status: "open",
      ...data,
    };
    setReports((prev) => [report, ...prev]);
    return report;
  }, []);

  const updateReport = useCallback((id: string, data: Partial<Report>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const addActionTaken = useCallback((id: string, action: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, actionTaken: action } : r)));
  }, []);

  const closeReport = useCallback((id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "closed" } : r)));
  }, []);

  const getDaysOpen = useCallback((report: Report): number => {
    if (report.status === "closed") return 0;
    const created = new Date(report.createdDate);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  const isRedFlagged = useCallback((report: Report): boolean => {
    return report.severity === "non_conformance" && report.status === "open" && getDaysOpen(report) > 30;
  }, [getDaysOpen]);

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser,
        auditPlans, scheduledAudits, reports,
        createAuditPlan, updateAuditPlan, deleteAuditPlan, scheduleAudit, updateScheduledAudit,
        createReport, updateReport, addActionTaken, closeReport,
        getDaysOpen, isRedFlagged,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { DEMO_USERS };
