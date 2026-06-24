import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ─── Domain / Location / Sublocation Taxonomy ───────────────────────────────

export const DOMAINS = [
  "Yoga Kendra",
  "Blood Bank",
  "School",
  "Hospital",
  "Community Centre",
  "Training Centre",
  "Research Institute",
  "Sports Academy",
  "Cultural Centre",
  "Dispensary",
];

export const LOCATIONS: Record<string, string[]> = {
  "Yoga Kendra": ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad"],
  "Blood Bank": ["Bengaluru", "Mumbai", "Hyderabad", "Chennai"],
  "School": ["Bengaluru", "Delhi", "Pune", "Kolkata"],
  "Hospital": ["Mumbai", "Hyderabad", "Delhi", "Chennai"],
  "Community Centre": ["Bengaluru", "Pune", "Ahmedabad", "Kolkata"],
  "Training Centre": ["Bengaluru", "Delhi", "Mumbai"],
  "Research Institute": ["Bengaluru", "Mumbai", "Hyderabad"],
  "Sports Academy": ["Delhi", "Pune", "Chennai"],
  "Cultural Centre": ["Mumbai", "Kolkata", "Bengaluru"],
  "Dispensary": ["Hyderabad", "Chennai", "Ahmedabad"],
};

export const SUBLOCATIONS: Record<string, Record<string, string[]>> = {
  "Yoga Kendra": {
    "Bengaluru": ["Jayanagar", "Koramangala", "Indiranagar", "Malleshwaram", "Basavanagudi"],
    "Mumbai": ["Andheri", "Borivali", "Malad", "Kandivali"],
    "Delhi": ["Laxmi Nagar", "Preet Vihar", "Mayur Vihar", "Patparganj"],
    "Pune": ["Kothrud", "Aundh", "Baner", "Pimpri"],
    "Hyderabad": ["Mehdipatnam", "Tolichowki", "Attapur", "Falaknuma"],
    "Chennai": ["T. Nagar", "Mylapore", "Adyar", "Velachery"],
    "Kolkata": ["Howrah", "Salkia", "Domjur"],
    "Ahmedabad": ["Naroda", "Odhav", "Vatva"],
  },
  "Blood Bank": {
    "Bengaluru": ["Rajajinagar", "Shivajinagar", "Hebbal"],
    "Mumbai": ["Dadar", "Bandra", "Kurla"],
    "Hyderabad": ["Secunderabad", "Ameerpet"],
    "Chennai": ["Kilpauk", "Perambur"],
  },
  "School": {
    "Bengaluru": ["Basavanagudi", "Chamarajpet", "Rajajinagar"],
    "Delhi": ["Dwarka", "Rohini", "Janakpuri"],
    "Pune": ["Shivajinagar", "Hadapsar"],
    "Kolkata": ["Salt Lake", "New Town"],
  },
  "Hospital": {
    "Mumbai": ["Dadar", "Kurla", "Mulund"],
    "Hyderabad": ["Secunderabad", "Kukatpally"],
    "Delhi": ["Rohini", "Pitampura"],
    "Chennai": ["Anna Nagar", "Perambur"],
  },
  "Community Centre": {
    "Bengaluru": ["Basavanagudi", "Rajajinagar", "Hebbal"],
    "Pune": ["Shivajinagar", "Kothrud"],
    "Ahmedabad": ["Satellite", "Navrangpura"],
    "Kolkata": ["Salt Lake", "New Town"],
  },
};

export function getSublocations(domain: string, location: string): string[] {
  return SUBLOCATIONS[domain]?.[location] ?? [];
}

// Backward-compat alias
export const PRAKALPAS = DOMAINS;
export const PRAKALPA_LOCATIONS: Record<string, string[]> = LOCATIONS;

export const DOMAIN_PRAMUKH_DETAILS: Record<string, { pramukh: string; praMukhEmail: string; seniorEmail: string }> = {
  "Yoga Kendra": { pramukh: "Suresh Babu K", praMukhEmail: "suresh.babu@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Blood Bank": { pramukh: "Dr. Rajesh Nair", praMukhEmail: "rajesh.nair@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
  "School": { pramukh: "Anil Sharma", praMukhEmail: "anil.sharma@rashtrotthana.org", seniorEmail: "north.regional@rashtrotthana.org" },
  "Hospital": { pramukh: "Meera Joshi", praMukhEmail: "meera.joshi@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
  "Community Centre": { pramukh: "Ravi Kumar", praMukhEmail: "ravi.kumar@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Training Centre": { pramukh: "Lakshmi Devi", praMukhEmail: "lakshmi.devi@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Research Institute": { pramukh: "Dipak Ghosh", praMukhEmail: "dipak.ghosh@rashtrotthana.org", seniorEmail: "east.regional@rashtrotthana.org" },
  "Sports Academy": { pramukh: "Hiren Patel", praMukhEmail: "hiren.patel@rashtrotthana.org", seniorEmail: "west.regional@rashtrotthana.org" },
  "Cultural Centre": { pramukh: "Pooja Iyer", praMukhEmail: "pooja.iyer@rashtrotthana.org", seniorEmail: "south.regional@rashtrotthana.org" },
  "Dispensary": { pramukh: "Amit Das", praMukhEmail: "amit.das@rashtrotthana.org", seniorEmail: "east.regional@rashtrotthana.org" },
};
export const PRAKALPA_DETAILS = DOMAIN_PRAMUKH_DETAILS;

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

export const INITIAL_AUDITORS = [
  "Dr. Sarah Jenkins",
  "Vikram Singh",
  "Anita Rao",
  "Rohan Mehra",
  "Marcus Thorne",
  "Priya Nair",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "lead_auditor" | "auditor" | "prakalpa_manager" | "ceo";

export interface LeadAuditorProfile {
  id: string;
  name: string;
  email: string;
  domains: string[];
}

export const LEAD_AUDITOR_PROFILES: LeadAuditorProfile[] = [
  { id: "la-1", name: "Ananya Iyer", email: "ananya.iyer@rashtrotthana.org", domains: ["Yoga Kendra", "Blood Bank", "Training Centre"] },
  { id: "la-2", name: "Priya Nair", email: "priya.nair@rashtrotthana.org", domains: ["School", "Community Centre"] },
  { id: "la-3", name: "Suresh Kumar", email: "suresh.kumar@rashtrotthana.org", domains: ["Hospital", "Dispensary"] },
];

export interface CurrentUser {
  name: string;
  role: Role;
  auditorName?: string;
  domain?: string;
  leadAuditorId?: string;
}

export interface Observation {
  id: string;
  number: number;
  area: string;
  severity: "non_conformance" | "open_for_improvement";
  finding: string;
  correctiveAction: string;
  status: "open" | "closed";
  dueDate?: string;
  dateClosed?: string;
}

export interface AuditPlan {
  id: string;
  iqaNumber: string;
  domain: string;
  location: string;
  sublocation?: string;
  auditPlannedDate: string;
  auditCoordinator: string;
  auditAreas: string[];
  prakalphaPramukh: string;
  auditors: string[];
  purpose?: string;
  createdDate: string;
  status: "pending" | "scheduled";
  prakalpa?: string; // derived label
}

export interface ScheduledAudit {
  id: string;
  iqaNumber: string;
  startDate: string;
  endDate: string;
  auditors: string[];
  finalAuditor: string;
  domain: string;
  location: string;
  sublocation?: string;
  purpose?: string;
  auditPlannedDate: string;
  createdDate: string;
  scheduledDate: string;
  auditCoordinator: string;
  prakalphaPramukh: string;
  auditAreas: string[];
  mailSent?: boolean;
  prakalpa?: string;
}

export interface Report {
  id: string;
  iarNumber: string;
  iqrNumber: string;
  iqaNumber: string;
  domain: string;
  location?: string;
  sublocation?: string;
  prakalpa?: string;
  auditor: string;
  auditCoordinator?: string;
  prakalphaPramukh?: string;
  visitDate: string;
  visitTime: string;
  createdDate: string;
  observations: Observation[];
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
  auditArea?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "mail";
  read: boolean;
  createdAt: string;
}

export interface RolePermission {
  role: Role;
  canCreateAuditPlan: boolean;
  canScheduleAudit: boolean;
  canEditReport: boolean;
  canCloseReport: boolean;
  canViewAllReports: boolean;
  canManageRoles: boolean;
  canViewDashboard: boolean;
  canAddAuditor: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, RolePermission> = {
  lead_auditor: { role: "lead_auditor", canCreateAuditPlan: true, canScheduleAudit: true, canEditReport: true, canCloseReport: true, canViewAllReports: true, canManageRoles: true, canViewDashboard: true, canAddAuditor: true },
  auditor: { role: "auditor", canCreateAuditPlan: false, canScheduleAudit: false, canEditReport: false, canCloseReport: true, canViewAllReports: false, canManageRoles: false, canViewDashboard: true, canAddAuditor: false },
  prakalpa_manager: { role: "prakalpa_manager", canCreateAuditPlan: false, canScheduleAudit: false, canEditReport: true, canCloseReport: false, canViewAllReports: true, canManageRoles: false, canViewDashboard: false, canAddAuditor: false },
  ceo: { role: "ceo", canCreateAuditPlan: false, canScheduleAudit: false, canEditReport: false, canCloseReport: false, canViewAllReports: true, canManageRoles: false, canViewDashboard: true, canAddAuditor: false },
};

// ─── ID generators ────────────────────────────────────────────────────────────
let iqaCounter = 1007;
let iarCounter = 1005;
function genIQA() { return `IQAN26${iqaCounter++}`; }
function genIAR() { return `IAR${iarCounter++}`; }
function genIQR() { return `IQR2026${Math.floor(1000000 + Math.random() * 8999999)}`; }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function daysFuture(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; }

// ─── Seed Data ────────────────────────────────────────────────────────────────
const seedPlans: AuditPlan[] = [
  { id: "plan-1", iqaNumber: "IQAN261001", domain: "Yoga Kendra", location: "Bengaluru", sublocation: "Jayanagar", auditPlannedDate: daysFuture(30), auditCoordinator: "Ananya Iyer", auditAreas: ["Finance & Accounts", "Safety & Compliance"], prakalphaPramukh: "Suresh Babu K", auditors: ["Dr. Sarah Jenkins"], purpose: "Annual safety and compliance inspection.", createdDate: daysAgo(5), status: "pending", prakalpa: "Yoga Kendra — Bengaluru" },
  { id: "plan-2", iqaNumber: "IQAN261002", domain: "Blood Bank", location: "Mumbai", sublocation: "Dadar", auditPlannedDate: daysFuture(45), auditCoordinator: "Priya Nair", auditAreas: ["Finance & Accounts", "Documentation & Records"], prakalphaPramukh: "Dr. Rajesh Nair", auditors: ["Vikram Singh", "Anita Rao"], purpose: "Quarterly financial records audit.", createdDate: daysAgo(3), status: "pending", prakalpa: "Blood Bank — Mumbai" },
  { id: "plan-3", iqaNumber: "IQAN261003", domain: "Community Centre", location: "Pune", sublocation: "Kothrud", auditPlannedDate: daysFuture(20), auditCoordinator: "Suresh Kumar", auditAreas: ["HR & Administration", "Programme Activities"], prakalphaPramukh: "Meera Joshi", auditors: ["Anita Rao"], createdDate: daysAgo(1), status: "pending", prakalpa: "Community Centre — Pune" },
];

const seedScheduled: ScheduledAudit[] = [
  { id: "sched-1", iqaNumber: "IQAN261004", startDate: daysAgo(2), endDate: daysFuture(5), auditors: ["Rohan Mehra"], finalAuditor: "Rohan Mehra", domain: "Yoga Kendra", location: "Hyderabad", sublocation: "Mehdipatnam", purpose: "Vendor procurement compliance check.", auditPlannedDate: daysFuture(7), createdDate: daysAgo(10), scheduledDate: daysAgo(2), auditCoordinator: "Ananya Iyer", prakalphaPramukh: "Ravi Kumar", auditAreas: ["Procurement", "Finance & Accounts"], mailSent: true, prakalpa: "Yoga Kendra — Hyderabad" },
  { id: "sched-2", iqaNumber: "IQAN261005", startDate: daysAgo(5), endDate: daysFuture(2), auditors: ["Dr. Sarah Jenkins"], finalAuditor: "Dr. Sarah Jenkins", domain: "Blood Bank", location: "Chennai", sublocation: "Kilpauk", purpose: "IT infrastructure security review.", auditPlannedDate: daysFuture(3), createdDate: daysAgo(15), scheduledDate: daysAgo(5), auditCoordinator: "Deepa Menon", prakalphaPramukh: "Lakshmi Devi", auditAreas: ["IT & Infrastructure", "Safety & Compliance"], mailSent: true, prakalpa: "Blood Bank — Chennai" },
  { id: "sched-3", iqaNumber: "IQAN261006", startDate: daysFuture(3), endDate: daysFuture(10), auditors: ["Marcus Thorne", "Anita Rao"], finalAuditor: "Marcus Thorne", domain: "School", location: "Delhi", sublocation: "Dwarka", purpose: "Annual operational process review.", auditPlannedDate: daysFuture(12), createdDate: daysAgo(7), scheduledDate: daysAgo(1), auditCoordinator: "Kiran Bhat", prakalphaPramukh: "Anil Sharma", auditAreas: ["Operations", "Quality Management"], mailSent: false, prakalpa: "School — Delhi" },
];

const seedReports: Report[] = [
  {
    id: "rep-1", iarNumber: "IAR1001", iqrNumber: "IQR20261837492", iqaNumber: "IQAN261004",
    domain: "Yoga Kendra", location: "Hyderabad", sublocation: "Mehdipatnam", prakalpa: "Yoga Kendra — Hyderabad",
    auditor: "Rohan Mehra", auditCoordinator: "Ananya Iyer", prakalphaPramukh: "Ravi Kumar", auditArea: "Finance & Accounts",
    visitDate: daysAgo(1), visitTime: "10:30 AM", createdDate: daysAgo(1),
    severity: "non_conformance", findings: "Vendor documentation missing for 3 contracts.", classificationStatus: "NC",
    correctiveAction: "", dueDate: daysFuture(30), proofFiles: ["vendor_contracts_scan.pdf", "petty_cash_report.xlsx"], hasChecklist: true, status: "open",
    observations: [
      { id: "obs-1-1", number: 1, area: "Finance & Accounts", severity: "non_conformance", finding: "Vendor documentation missing for 3 contracts. Purchase orders not approved by designated authority for items above ₹50,000.", correctiveAction: "", status: "open", dueDate: daysFuture(30) },
      { id: "obs-1-2", number: 2, area: "Finance & Accounts", severity: "non_conformance", finding: "Financial reconciliation shows discrepancies in petty cash register for March and April.", correctiveAction: "", status: "open", dueDate: daysFuture(30) },
    ],
  },
  {
    id: "rep-2", iarNumber: "IAR1002", iqrNumber: "IQR20268204736", iqaNumber: "IQAN261005",
    domain: "Blood Bank", location: "Chennai", sublocation: "Kilpauk", prakalpa: "Blood Bank — Chennai",
    auditor: "Dr. Sarah Jenkins", auditCoordinator: "Deepa Menon", prakalphaPramukh: "Lakshmi Devi", auditArea: "IT & Infrastructure",
    visitDate: daysAgo(3), visitTime: "02:15 PM", createdDate: daysAgo(3),
    severity: "open_for_improvement", findings: "IT asset register partially updated.", classificationStatus: "OFI",
    correctiveAction: "Implementing biometric access system.", dueDate: daysFuture(15), proofFiles: ["server_room_photos.jpg"], hasChecklist: false, status: "open",
    actionTaken: "Implementing biometric access system by end of month.",
    observations: [
      { id: "obs-2-1", number: 1, area: "IT & Infrastructure", severity: "open_for_improvement", finding: "IT asset register partially updated. Server room access logs not maintained consistently.", correctiveAction: "Implementing biometric access system by end of month.", status: "open", dueDate: daysFuture(15) },
    ],
  },
  {
    id: "rep-3", iarNumber: "IAR1003", iqrNumber: "IQR20269374820", iqaNumber: "IQAN261004",
    domain: "Yoga Kendra", location: "Hyderabad", sublocation: "Mehdipatnam", prakalpa: "Yoga Kendra — Hyderabad",
    auditor: "Rohan Mehra", auditCoordinator: "Ananya Iyer", prakalphaPramukh: "Ravi Kumar", auditArea: "Safety & Compliance",
    visitDate: daysAgo(35), visitTime: "11:00 AM", createdDate: daysAgo(35),
    severity: "non_conformance", findings: "Safety equipment not maintained as per OSHA standards.", classificationStatus: "NC",
    correctiveAction: "", dueDate: daysAgo(5), proofFiles: ["safety_inspection_photos.zip"], hasChecklist: true, status: "open",
    observations: [
      { id: "obs-3-1", number: 1, area: "Safety & Compliance", severity: "non_conformance", finding: "Safety equipment not maintained as per OSHA standards. Fire extinguisher overdue by 6 months.", correctiveAction: "", status: "open", dueDate: daysAgo(5) },
      { id: "obs-3-2", number: 2, area: "Safety & Compliance", severity: "non_conformance", finding: "Emergency exit blocked by storage materials.", correctiveAction: "", status: "open", dueDate: daysAgo(5) },
    ],
  },
  {
    id: "rep-4", iarNumber: "IAR1004", iqrNumber: "IQR20262938471", iqaNumber: "IQAN261005",
    domain: "Blood Bank", location: "Chennai", sublocation: "Kilpauk", prakalpa: "Blood Bank — Chennai",
    auditor: "Dr. Sarah Jenkins", auditCoordinator: "Deepa Menon", prakalphaPramukh: "Lakshmi Devi", auditArea: "HR & Administration",
    visitDate: daysAgo(60), visitTime: "09:45 AM", createdDate: daysAgo(60),
    severity: "open_for_improvement", findings: "Minor gaps in employee training documentation.", classificationStatus: "OFI",
    correctiveAction: "Training records system implemented.", dueDate: daysAgo(30), dateClosed: daysAgo(20),
    proofFiles: [], hasChecklist: false, status: "closed",
    actionTaken: "Training records system implemented. All staff updated.",
    observations: [
      { id: "obs-4-1", number: 1, area: "HR & Administration", severity: "open_for_improvement", finding: "Minor gaps in employee training documentation. Recommend mandatory quarterly training records.", correctiveAction: "Training records system implemented. All staff updated.", status: "closed", dueDate: daysAgo(30), dateClosed: daysAgo(20) },
    ],
  },
];

const seedNotifications: Notification[] = [
  { id: "notif-1", title: "Audit Scheduled — Mail Sent", message: "IQAN261004 (Yoga Kendra — Hyderabad, Mehdipatnam) has been scheduled. Confirmation mail sent to all stakeholders.", type: "mail", read: false, createdAt: daysAgo(2) },
  { id: "notif-2", title: "Audit Scheduled — Mail Sent", message: "IQAN261005 (Blood Bank — Chennai, Kilpauk) has been scheduled. Confirmation mail sent to all stakeholders.", type: "mail", read: true, createdAt: daysAgo(5) },
];

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextType {
  currentUser: CurrentUser;
  setCurrentUser: (u: CurrentUser) => void;
  auditors: string[];
  addAuditor: (name: string) => void;
  leadAuditorProfiles: LeadAuditorProfile[];
  updateLeadAuditorProfile: (id: string, data: Partial<LeadAuditorProfile>) => void;
  rolePermissions: Record<Role, RolePermission>;
  updateRolePermission: (role: Role, data: Partial<RolePermission>) => void;

  auditPlans: AuditPlan[];
  scheduledAudits: ScheduledAudit[];
  reports: Report[];
  notifications: Notification[];

  createAuditPlan: (data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">) => AuditPlan;
  updateAuditPlan: (id: string, data: Partial<AuditPlan>) => void;
  deleteAuditPlan: (id: string) => void;
  scheduleAudit: (planId: string, data: Pick<ScheduledAudit, "startDate" | "endDate" | "auditors" | "finalAuditor">) => void;
  updateScheduledAudit: (id: string, data: Partial<ScheduledAudit>) => void;

  createReport: (data: Omit<Report, "id" | "iarNumber" | "iqrNumber" | "createdDate" | "status">) => Report;
  updateReport: (id: string, data: Partial<Report>) => void;
  addObservationCorrectiveAction: (reportId: string, obsId: string, action: string) => void;
  closeObservation: (reportId: string, obsId: string) => void;
  addActionTaken: (id: string, action: string) => void;
  closeReport: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  getDaysOpen: (r: Report) => number;
  isRedFlagged: (r: Report) => boolean;
  isOverdue: (r: Report) => boolean;
  canAutoClose: (r: Report) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const DEMO_USERS: CurrentUser[] = [
  { name: "Ananya Iyer", role: "lead_auditor", leadAuditorId: "la-1" },
  { name: "Priya Nair", role: "lead_auditor", leadAuditorId: "la-2" },
  { name: "Dr. Sarah Jenkins", role: "auditor", auditorName: "Dr. Sarah Jenkins" },
  { name: "Rohan Mehra", role: "auditor", auditorName: "Rohan Mehra" },
  { name: "Ravi Kumar", role: "prakalpa_manager", domain: "Yoga Kendra" },
  { name: "Meena Sharma", role: "prakalpa_manager", domain: "Blood Bank" },
  { name: "Ramesh Gupta", role: "ceo" },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEMO_USERS[0]);
  const [auditors, setAuditors] = useState<string[]>(INITIAL_AUDITORS);
  const [leadAuditorProfiles, setLeadAuditorProfiles] = useState<LeadAuditorProfile[]>(LEAD_AUDITOR_PROFILES);
  const [rolePermissions, setRolePermissions] = useState<Record<Role, RolePermission>>(DEFAULT_ROLE_PERMISSIONS);
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>(seedPlans);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>(seedScheduled);
  const [reports, setReports] = useState<Report[]>(seedReports);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);

  const addAuditor = useCallback((name: string) => {
    setAuditors((prev) => prev.includes(name) ? prev : [...prev, name]);
  }, []);

  const updateLeadAuditorProfile = useCallback((id: string, data: Partial<LeadAuditorProfile>) => {
    setLeadAuditorProfiles((prev) => prev.map((la) => la.id === id ? { ...la, ...data } : la));
  }, []);

  const updateRolePermission = useCallback((role: Role, data: Partial<RolePermission>) => {
    setRolePermissions((prev) => ({ ...prev, [role]: { ...prev[role], ...data } }));
  }, []);

  const pushNotification = useCallback((n: Omit<Notification, "id" | "read" | "createdAt">) => {
    setNotifications((prev) => [{ ...n, id: `notif-${Date.now()}`, read: false, createdAt: new Date().toISOString().split("T")[0] }, ...prev]);
  }, []);

  const createAuditPlan = useCallback((data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">): AuditPlan => {
    const plan: AuditPlan = { id: `plan-${Date.now()}`, iqaNumber: genIQA(), createdDate: new Date().toISOString().split("T")[0], prakalpa: `${data.domain} — ${data.location}${data.sublocation ? `, ${data.sublocation}` : ""}`, ...data };
    setAuditPlans((prev) => [plan, ...prev]);
    return plan;
  }, []);

  const updateAuditPlan = useCallback((id: string, data: Partial<AuditPlan>) => {
    setAuditPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deleteAuditPlan = useCallback((id: string) => {
    setAuditPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const scheduleAudit = useCallback((planId: string, data: Pick<ScheduledAudit, "startDate" | "endDate" | "auditors" | "finalAuditor">) => {
    setAuditPlans((prev) => {
      const plan = prev.find((p) => p.id === planId);
      if (!plan) return prev;
      const scheduled: ScheduledAudit = {
        id: `sched-${Date.now()}`,
        iqaNumber: plan.iqaNumber, domain: plan.domain, location: plan.location, sublocation: plan.sublocation,
        purpose: plan.purpose, auditPlannedDate: plan.auditPlannedDate, createdDate: plan.createdDate,
        scheduledDate: new Date().toISOString().split("T")[0], auditCoordinator: plan.auditCoordinator,
        prakalphaPramukh: plan.prakalphaPramukh, auditAreas: plan.auditAreas,
        mailSent: true, prakalpa: plan.prakalpa, ...data,
      };
      setScheduledAudits((s) => [scheduled, ...s]);
      pushNotification({
        title: "Audit Scheduled — Mail Sent",
        message: `${plan.iqaNumber} (${plan.domain} — ${plan.location}${plan.sublocation ? `, ${plan.sublocation}` : ""}) scheduled. Mail sent to all stakeholders.`,
        type: "mail",
      });
      return prev.filter((p) => p.id !== planId);
    });
  }, [pushNotification]);

  const updateScheduledAudit = useCallback((id: string, data: Partial<ScheduledAudit>) => {
    setScheduledAudits((prev) => prev.map((s) => s.id === id ? { ...s, ...data } : s));
  }, []);

  const createReport = useCallback((data: Omit<Report, "id" | "iarNumber" | "iqrNumber" | "createdDate" | "status">): Report => {
    const report: Report = { id: `rep-${Date.now()}`, iarNumber: genIAR(), iqrNumber: genIQR(), createdDate: new Date().toISOString().split("T")[0], status: "open", prakalpa: `${data.domain} — ${data.location}`, ...data };
    setReports((prev) => [report, ...prev]);
    return report;
  }, []);

  const updateReport = useCallback((id: string, data: Partial<Report>) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  }, []);

  const addObservationCorrectiveAction = useCallback((reportId: string, obsId: string, action: string) => {
    setReports((prev) => prev.map((r) => {
      if (r.id !== reportId) return r;
      return { ...r, observations: r.observations.map((o) => o.id === obsId ? { ...o, correctiveAction: action } : o) };
    }));
  }, []);

  const closeObservation = useCallback((reportId: string, obsId: string) => {
    setReports((prev) => prev.map((r) => {
      if (r.id !== reportId) return r;
      const observations = r.observations.map((o) =>
        o.id === obsId && o.correctiveAction.trim()
          ? { ...o, status: "closed" as const, dateClosed: new Date().toISOString().split("T")[0] }
          : o
      );
      const allClosed = observations.every((o) => o.status === "closed");
      return { ...r, observations, status: allClosed ? "closed" as const : r.status, dateClosed: allClosed ? new Date().toISOString().split("T")[0] : r.dateClosed };
    }));
  }, []);

  const addActionTaken = useCallback((id: string, action: string) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, actionTaken: action } : r));
  }, []);

  const closeReport = useCallback((id: string) => {
    setReports((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const allHaveCA = r.observations.every((o) => o.correctiveAction.trim() !== "");
      if (!allHaveCA) return r;
      return { ...r, status: "closed" as const, dateClosed: new Date().toISOString().split("T")[0], observations: r.observations.map((o) => ({ ...o, status: "closed" as const, dateClosed: o.dateClosed || new Date().toISOString().split("T")[0] })) };
    }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getDaysOpen = useCallback((r: Report) => {
    if (r.status === "closed") return 0;
    return Math.floor((Date.now() - new Date(r.createdDate).getTime()) / 86400000);
  }, []);

  const isRedFlagged = useCallback((r: Report) => r.severity === "non_conformance" && r.status === "open" && getDaysOpen(r) > 30, [getDaysOpen]);
  const isOverdue = useCallback((r: Report) => r.status !== "closed" && !!r.dueDate && new Date(r.dueDate) < new Date(), []);
  const canAutoClose = useCallback((r: Report) => r.observations.every((o) => o.correctiveAction.trim() !== ""), []);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, auditors, addAuditor, leadAuditorProfiles, updateLeadAuditorProfile,
      rolePermissions, updateRolePermission,
      auditPlans, scheduledAudits, reports, notifications,
      createAuditPlan, updateAuditPlan, deleteAuditPlan, scheduleAudit, updateScheduledAudit,
      createReport, updateReport, addObservationCorrectiveAction, closeObservation, addActionTaken, closeReport,
      markNotificationRead, markAllNotificationsRead,
      getDaysOpen, isRedFlagged, isOverdue, canAutoClose,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
