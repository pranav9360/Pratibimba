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

export const PRAKALPA_LOCATIONS: Record<string, string[]> = {
  "Bengaluru Central": ["Jayanagar", "Koramangala", "Indiranagar", "Malleshwaram"],
  "Mumbai North": ["Andheri", "Borivali", "Malad", "Kandivali"],
  "Delhi East": ["Laxmi Nagar", "Preet Vihar", "Mayur Vihar", "Patparganj"],
  "Pune West": ["Kothrud", "Aundh", "Baner", "Pimpri"],
  "Hyderabad South": ["Mehdipatnam", "Tolichowki", "Attapur", "Falaknuma"],
  "Chennai Metro": ["T. Nagar", "Mylapore", "Adyar", "Velachery"],
  "Kolkata West": ["Howrah", "Salkia", "Domjur", "Santragachi"],
  "Ahmedabad East": ["Naroda", "Odhav", "Vatva", "Nikol"],
};

export const PRAKALPA_DETAILS: Record<string, { pramukh: string; praMukhEmail: string; seniorEmail: string }> = {
  "Bengaluru Central": { pramukh: "Suresh Babu K", praMukhEmail: "suresh.babu@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Mumbai North": { pramukh: "Rajesh Nair", praMukhEmail: "rajesh.nair@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
  "Delhi East": { pramukh: "Anil Sharma", praMukhEmail: "anil.sharma@rashtrotthana.org", seniorEmail: "north.regional@rashtrotthana.org" },
  "Pune West": { pramukh: "Meera Joshi", praMukhEmail: "meera.joshi@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
  "Hyderabad South": { pramukh: "Ravi Kumar", praMukhEmail: "ravi.kumar@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Chennai Metro": { pramukh: "Lakshmi Devi", praMukhEmail: "lakshmi.devi@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Kolkata West": { pramukh: "Dipak Ghosh", praMukhEmail: "dipak.ghosh@rashtrotthana.org", seniorEmail: "east.regional@rashtrotthana.org" },
  "Ahmedabad East": { pramukh: "Hiren Patel", praMukhEmail: "hiren.patel@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
};

export const AUDIT_AREAS = [
  "Finance & Accounts",
  "HR & Administration",
  "Operations",
  "IT & Infrastructure",
  "Safety & Compliance",
  "Procurement",
  "Quality Management",
  "Documentation & Records",
  "Programme Activities",
  "Infrastructure & Facilities",
];

export const AUDIT_COORDINATORS = [
  "Ananya Iyer",
  "Priya Nair",
  "Suresh Kumar",
  "Deepa Menon",
  "Kiran Bhat",
];

export const AUDITORS = [
  "Dr. Sarah Jenkins",
  "Vikram Singh",
  "Anita Rao",
  "Rohan Mehra",
  "Marcus Thorne",
  "Priya Nair",
];

export const PRAKALPA_TYPES = [
  "Yoga Kendra",
  "School",
  "Hospital",
  "Community Centre",
  "Training Centre",
  "Research Institute",
  "Sports Academy",
  "Cultural Centre",
];

export type Role = "chief_auditor" | "auditor" | "prakalpa_manager";

export interface CurrentUser {
  name: string;
  role: Role;
  auditorName?: string;
  prakalpa?: string;
}

export interface AuditPlan {
  id: string;
  iqaNumber: string;
  prakalpa: string;
  prakalpaType?: string;
  location?: string;
  auditPlannedDate: string;
  auditCoordinator: string;
  planPassword: string;
  auditAreas: string[];
  prakalphaPramukh: string;
  prakalphaPraMukhEmail: string;
  pramukkhSeniorEmail: string;
  auditors?: string[];
  auditorEmail?: string;
  auditorPhone?: string;
  probableAuditor: string;
  purpose: string;
  createdDate: string;
  status: "pending" | "scheduled";
}

export interface ScheduledAudit {
  id: string;
  iqaNumber: string;
  startDate: string;
  endDate: string;
  finalAuditor: string;
  prakalpa: string;
  location?: string;
  purpose: string;
  auditPlannedDate: string;
  createdDate: string;
  scheduledDate: string;
  auditCoordinator: string;
  planPassword: string;
  prakalphaPramukh: string;
  auditAreas: string[];
}

export interface Report {
  id: string;
  iarNumber: string;
  iqrNumber: string;
  iqaNumber: string;
  prakalpa: string;
  location?: string;
  auditor: string;
  auditCoordinator?: string;
  prakalphaPramukh?: string;
  auditArea?: string;
  visitDate: string;
  visitTime: string;
  createdDate: string;
  severity: "open_for_improvement" | "non_conformance";
  findings: string;
  classificationStatus?: string;
  correctiveAction?: string;
  dueDate?: string;
  dateClosed?: string;
  proofFiles: string[];
  hasChecklist: boolean;
  status: "open" | "closed";
  actionTaken?: string;
  iqaReportPdf?: string;
}

let iqaCounter = 1001;
let iarCounter = 1001;
let iqrCounter = 1000000;

function genIQA() {
  return `IQAN26${iqaCounter++}`;
}

function genIAR() {
  return `IAR${iarCounter++}`;
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

const seedPlans: AuditPlan[] = [
  {
    id: "plan-1",
    iqaNumber: "IQAN261001",
    prakalpa: "Bengaluru Central",
    prakalpaType: "Yoga Kendra",
    location: "Jayanagar",
    auditPlannedDate: daysFuture(30),
    auditCoordinator: "Ananya Iyer",
    planPassword: "BLR2026@1",
    auditAreas: ["Finance & Accounts", "Safety & Compliance"],
    prakalphaPramukh: "Suresh Babu K",
    prakalphaPraMukhEmail: "suresh.babu@rashtrotthana.org",
    pramukkhSeniorEmail: "south.regional@rashtrotthana.org",
    probableAuditor: "Dr. Sarah Jenkins",
    auditors: ["Dr. Sarah Jenkins"],
    purpose: "Annual safety and compliance inspection for yoga kendra operations.",
    createdDate: daysAgo(5),
    status: "pending",
  },
  {
    id: "plan-2",
    iqaNumber: "IQAN261002",
    prakalpa: "Mumbai North",
    prakalpaType: "School",
    location: "Andheri",
    auditPlannedDate: daysFuture(45),
    auditCoordinator: "Priya Nair",
    planPassword: "MUM2026@2",
    auditAreas: ["Finance & Accounts", "Documentation & Records"],
    prakalphaPramukh: "Rajesh Nair",
    prakalphaPraMukhEmail: "rajesh.nair@rashtrotthana.org",
    pramukkhSeniorEmail: "west.regional@rashtrotthana.org",
    probableAuditor: "Vikram Singh",
    auditors: ["Vikram Singh"],
    purpose: "Quarterly financial records audit and documentation review.",
    createdDate: daysAgo(3),
    status: "pending",
  },
  {
    id: "plan-3",
    iqaNumber: "IQAN261003",
    prakalpa: "Pune West",
    prakalpaType: "Community Centre",
    location: "Kothrud",
    auditPlannedDate: daysFuture(20),
    auditCoordinator: "Suresh Kumar",
    planPassword: "PUN2026@3",
    auditAreas: ["HR & Administration", "Programme Activities"],
    prakalphaPramukh: "Meera Joshi",
    prakalphaPraMukhEmail: "meera.joshi@rashtrotthana.org",
    pramukkhSeniorEmail: "west.regional@rashtrotthana.org",
    probableAuditor: "Anita Rao",
    auditors: ["Anita Rao"],
    purpose: "HR process compliance and employee welfare assessment.",
    createdDate: daysAgo(1),
    status: "pending",
  },
];

const seedScheduled: ScheduledAudit[] = [
  {
    id: "sched-1",
    iqaNumber: "IQAN261004",
    startDate: daysAgo(2),
    endDate: daysFuture(5),
    finalAuditor: "Rohan Mehra",
    prakalpa: "Hyderabad South",
    location: "Mehdipatnam",
    purpose: "Vendor procurement compliance check — Q3 2026.",
    auditPlannedDate: daysFuture(7),
    createdDate: daysAgo(10),
    scheduledDate: daysAgo(2),
    auditCoordinator: "Ananya Iyer",
    planPassword: "HYD2026@4",
    prakalphaPramukh: "Ravi Kumar",
    auditAreas: ["Procurement", "Finance & Accounts"],
  },
  {
    id: "sched-2",
    iqaNumber: "IQAN261005",
    startDate: daysAgo(5),
    endDate: daysFuture(2),
    finalAuditor: "Dr. Sarah Jenkins",
    prakalpa: "Chennai Metro",
    location: "T. Nagar",
    purpose: "IT infrastructure security review and data governance audit.",
    auditPlannedDate: daysFuture(3),
    createdDate: daysAgo(15),
    scheduledDate: daysAgo(5),
    auditCoordinator: "Deepa Menon",
    planPassword: "CHN2026@5",
    prakalphaPramukh: "Lakshmi Devi",
    auditAreas: ["IT & Infrastructure", "Safety & Compliance"],
  },
  {
    id: "sched-3",
    iqaNumber: "IQAN261006",
    startDate: daysFuture(3),
    endDate: daysFuture(10),
    finalAuditor: "Marcus Thorne",
    prakalpa: "Delhi East",
    location: "Laxmi Nagar",
    purpose: "Annual operational process review and quality assurance.",
    auditPlannedDate: daysFuture(12),
    createdDate: daysAgo(7),
    scheduledDate: daysAgo(1),
    auditCoordinator: "Kiran Bhat",
    planPassword: "DEL2026@6",
    prakalphaPramukh: "Anil Sharma",
    auditAreas: ["Operations", "Quality Management"],
  },
];

const seedReports: Report[] = [
  {
    id: "rep-1",
    iarNumber: "IAR1001",
    iqrNumber: "IQR20261837492",
    iqaNumber: "IQAN261004",
    prakalpa: "Hyderabad South",
    location: "Mehdipatnam",
    auditor: "Rohan Mehra",
    auditCoordinator: "Ananya Iyer",
    prakalphaPramukh: "Ravi Kumar",
    auditArea: "Finance & Accounts",
    visitDate: daysAgo(1),
    visitTime: "10:30 AM",
    createdDate: daysAgo(1),
    severity: "non_conformance",
    findings: "Vendor documentation missing for 3 contracts. Financial reconciliation shows discrepancies in petty cash register for March and April. Purchase orders not approved by designated authority for items above ₹50,000.",
    classificationStatus: "NC",
    correctiveAction: "",
    dueDate: daysFuture(30),
    proofFiles: ["vendor_contracts_scan.pdf", "petty_cash_report.xlsx"],
    hasChecklist: true,
    status: "open",
  },
  {
    id: "rep-2",
    iarNumber: "IAR1002",
    iqrNumber: "IQR20268204736",
    iqaNumber: "IQAN261005",
    prakalpa: "Chennai Metro",
    location: "T. Nagar",
    auditor: "Dr. Sarah Jenkins",
    auditCoordinator: "Deepa Menon",
    prakalphaPramukh: "Lakshmi Devi",
    auditArea: "IT & Infrastructure",
    visitDate: daysAgo(3),
    visitTime: "02:15 PM",
    createdDate: daysAgo(3),
    severity: "open_for_improvement",
    findings: "IT asset register partially updated. Server room access logs not maintained consistently. Recommend implementing automated access tracking system.",
    classificationStatus: "OFI",
    correctiveAction: "Implementing biometric access system by end of month.",
    dueDate: daysFuture(15),
    proofFiles: ["server_room_photos.jpg"],
    hasChecklist: false,
    status: "open",
    actionTaken: "Implementing biometric access system by end of month. Asset register being updated by IT team.",
  },
  {
    id: "rep-3",
    iarNumber: "IAR1003",
    iqrNumber: "IQR20269374820",
    iqaNumber: "IQAN261004",
    prakalpa: "Hyderabad South",
    location: "Mehdipatnam",
    auditor: "Rohan Mehra",
    auditCoordinator: "Ananya Iyer",
    prakalphaPramukh: "Ravi Kumar",
    auditArea: "Safety & Compliance",
    visitDate: daysAgo(35),
    visitTime: "11:00 AM",
    createdDate: daysAgo(35),
    severity: "non_conformance",
    findings: "Safety equipment not maintained as per OSHA standards. Fire extinguisher inspection overdue by 6 months. Emergency exit blocked.",
    classificationStatus: "NC",
    correctiveAction: "",
    dueDate: daysAgo(5),
    proofFiles: ["safety_inspection_photos.zip"],
    hasChecklist: true,
    status: "open",
  },
  {
    id: "rep-4",
    iarNumber: "IAR1004",
    iqrNumber: "IQR20262938471",
    iqaNumber: "IQAN261005",
    prakalpa: "Chennai Metro",
    location: "T. Nagar",
    auditor: "Dr. Sarah Jenkins",
    auditCoordinator: "Deepa Menon",
    prakalphaPramukh: "Lakshmi Devi",
    auditArea: "HR & Administration",
    visitDate: daysAgo(60),
    visitTime: "09:45 AM",
    createdDate: daysAgo(60),
    severity: "open_for_improvement",
    findings: "Minor gaps in employee training documentation. Recommend mandatory quarterly training records.",
    classificationStatus: "OFI",
    correctiveAction: "Training records system implemented. All staff updated.",
    dueDate: daysAgo(30),
    dateClosed: daysAgo(20),
    proofFiles: [],
    hasChecklist: false,
    status: "closed",
    actionTaken: "Training records system implemented. All staff updated.",
  },
];

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

  createReport: (data: Omit<Report, "id" | "iarNumber" | "iqrNumber" | "createdDate" | "status">) => Report;
  updateReport: (id: string, data: Partial<Report>) => void;
  addActionTaken: (id: string, action: string) => void;
  closeReport: (id: string) => void;

  getDaysOpen: (report: Report) => number;
  isRedFlagged: (report: Report) => boolean;
  isOverdue: (report: Report) => boolean;
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
        location: plan.location,
        purpose: plan.purpose,
        auditPlannedDate: plan.auditPlannedDate,
        createdDate: plan.createdDate,
        scheduledDate: new Date().toISOString().split("T")[0],
        auditCoordinator: plan.auditCoordinator,
        planPassword: plan.planPassword,
        prakalphaPramukh: plan.prakalphaPramukh,
        auditAreas: plan.auditAreas,
        ...data,
      };
      setScheduledAudits((s) => [scheduled, ...s]);
      return prev.filter((p) => p.id !== planId);
    });
  }, []);

  const updateScheduledAudit = useCallback((id: string, data: Partial<ScheduledAudit>) => {
    setScheduledAudits((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  const createReport = useCallback((data: Omit<Report, "id" | "iarNumber" | "iqrNumber" | "createdDate" | "status">): Report => {
    const report: Report = {
      id: `rep-${Date.now()}`,
      iarNumber: genIAR(),
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
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "closed", dateClosed: new Date().toISOString().split("T")[0] } : r)));
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

  const isOverdue = useCallback((report: Report): boolean => {
    if (report.status === "closed") return false;
    if (!report.dueDate) return false;
    return new Date(report.dueDate) < new Date();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser, setCurrentUser,
        auditPlans, scheduledAudits, reports,
        createAuditPlan, updateAuditPlan, deleteAuditPlan, scheduleAudit, updateScheduledAudit,
        createReport, updateReport, addActionTaken, closeReport,
        getDaysOpen, isRedFlagged, isOverdue,
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
