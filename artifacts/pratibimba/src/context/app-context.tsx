import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  getAuditPlans,
  createAuditPlan as createAuditPlanApi,
  updateAuditPlan as updateAuditPlanApi,
  deleteAuditPlan as deleteAuditPlanApi,
  scheduleAudit as scheduleAuditApi,
} from "../services/auditPlanService";

import {
  getScheduledAudits,
  updateScheduledAudit as updateScheduledAuditApi,
  deleteScheduledAudit as deleteScheduledAuditApi,
  markMailSent as markMailSentApi,
} from "../services/scheduledAuditService";

import {
  getReports,
  createReport as createReportApi,
  updateReport as updateReportApi,
} from "../services/reportService";

import { getRoles, updateRole as updateRoleApi } from "../services/roleService";

import {
  getUsers,
  updateUser as updateUserApi,
} from "../services/userService";

import {
  getAuthenticatedUser,
  hasAuthenticationToken,
  clearAuthenticatedSession,
} from "../services/authService";

export const PRAKALPAS = [
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
};

export function getSublocations(prakalpa: string, location: string): string[] {
  return SUBLOCATIONS[prakalpa]?.[location] ?? [];
}

export const PRAKALPA_LOCATIONS: Record<string, string[]> = LOCATIONS;

export const PRAKALPA_PRAMUKH_DETAILS: Record<string, { pramukh: string; praMukhEmail: string; seniorEmail: string }> = {
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
export const PRAKALPA_DETAILS = PRAKALPA_PRAMUKH_DETAILS;

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

export type Role =
  | "super_admin"
  | "admin"
  | "lead_auditor"
  | "audit_coordinator"
  | "auditor"
  | "prakalpa_manager";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  prakalpa?: string;
  assignedPrakalpas?: string[];
  active: boolean;
  createdDate: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  prakalpa?: string;
  assignedPrakalpas?: string[];
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
  _id?: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation?: string;
  auditPlannedDate: string;
  auditCoordinator: string;
  auditCoordinatorId?: string;
  auditAreas: string[];
  prakalphaPramukh: string;
  auditors: string[];
  auditorIds?: string[];
  purpose?: string;
  createdDate: string;
  status: "pending" | "scheduled" | "completed";
}

export interface ScheduledAudit {
  id: string;
  _id?: string;
  // Linked Audit Plan's id. The backend treats the Audit Plan as the
  // source of truth for the start date — updates to `startDate` must be
  // sent to `/audit-plans/:auditPlan`, not `/scheduled-audits/:id`.
  auditPlan?: string;
  iqaNumber: string;
  startDate: string;
  endDate: string;
  auditors: string[];
  leadAuditor: string;
  prakalpa: string;
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
  status?: "upcoming" | "ongoing" | "completed";
}

export interface Report {
  id: string;
  iarNumber: string;
  iqrNumber: string;
  iqaNumber: string;
  prakalpa: string;
  location?: string;
  sublocation?: string;
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
  completionRemarks?: string;
  closedBy?: string;
  closedAt?: string;
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
  canManageUsers: boolean;
  canViewDashboard: boolean;
  canAddAuditor: boolean;

  // Workflow permissions
  canAssignAuditCoordinator: boolean;
  canAssignAuditors: boolean;
  canAssignLeadAuditor: boolean;
  canSubmitFindings: boolean;
  canReviewFindings: boolean;
  canSubmitFindingsToCoordinator: boolean;
  canGenerateReport: boolean;
  canSendReportToPrakalpa: boolean;
  canSubmitCorrectiveAction: boolean;
  canVerifyCorrectiveAction: boolean;
  canManagePrakalpas: boolean;
  canManageAdmins: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, RolePermission> = {
  super_admin: {
    role: "super_admin",
    canCreateAuditPlan: false,
    canScheduleAudit: false,
    canEditReport: false,
    canCloseReport: false,
    canViewAllReports: true,
    canManageRoles: false,
    canManageUsers: true,
    canViewDashboard: true,
    canAddAuditor: false,
    canAssignAuditCoordinator: false,
    canAssignAuditors: false,
    canAssignLeadAuditor: false,
    canSubmitFindings: false,
    canReviewFindings: false,
    canSubmitFindingsToCoordinator: false,
    canGenerateReport: false,
    canSendReportToPrakalpa: false,
    canSubmitCorrectiveAction: false,
    canVerifyCorrectiveAction: false,
    canManagePrakalpas: false,
    canManageAdmins: true,
  },

  admin: {
    role: "admin",
    canCreateAuditPlan: true,
    canScheduleAudit: false,
    canEditReport: false,
    canCloseReport: false,
    canViewAllReports: true,
    canManageRoles: true,
    canManageUsers: true,
    canViewDashboard: true,
    canAddAuditor: true,
    canAssignAuditCoordinator: true,
    canAssignAuditors: false,
    canAssignLeadAuditor: false,
    canSubmitFindings: false,
    canReviewFindings: false,
    canSubmitFindingsToCoordinator: false,
    canGenerateReport: false,
    canSendReportToPrakalpa: false,
    canSubmitCorrectiveAction: false,
    canVerifyCorrectiveAction: false,
    canManagePrakalpas: true,
    canManageAdmins: false,
  },

  audit_coordinator: {
    role: "audit_coordinator",
    canCreateAuditPlan: false,
    canScheduleAudit: true,
    canEditReport: true,
    canCloseReport: true,
    canViewAllReports: false,
    canManageRoles: false,
    canManageUsers: false,
    canViewDashboard: true,
    canAddAuditor: true,
    canAssignAuditCoordinator: false,
    canAssignAuditors: true,
    canAssignLeadAuditor: true,
    canSubmitFindings: false,
    canReviewFindings: false,
    canSubmitFindingsToCoordinator: false,
    canGenerateReport: true,
    canSendReportToPrakalpa: true,
    canSubmitCorrectiveAction: false,
    canVerifyCorrectiveAction: true,
    canManagePrakalpas: false,
    canManageAdmins: false,
  },

  lead_auditor: {
    role: "lead_auditor",
    canCreateAuditPlan: false,
    canScheduleAudit: false,
    canEditReport: false,
    canCloseReport: false,
    canViewAllReports: false,
    canManageRoles: false,
    canManageUsers: false,
    canViewDashboard: true,
    canAddAuditor: false,
    canAssignAuditCoordinator: false,
    canAssignAuditors: false,
    canAssignLeadAuditor: false,
    canSubmitFindings: true,
    canReviewFindings: true,
    canSubmitFindingsToCoordinator: true,
    canGenerateReport: false,
    canSendReportToPrakalpa: false,
    canSubmitCorrectiveAction: false,
    canVerifyCorrectiveAction: false,
    canManagePrakalpas: false,
    canManageAdmins: false,
  },

  auditor: {
    role: "auditor",
    canCreateAuditPlan: false,
    canScheduleAudit: false,
    canEditReport: false,
    canCloseReport: false,
    canViewAllReports: false,
    canManageRoles: false,
    canManageUsers: false,
    canViewDashboard: true,
    canAddAuditor: false,
    canAssignAuditCoordinator: false,
    canAssignAuditors: false,
    canAssignLeadAuditor: false,
    canSubmitFindings: true,
    canReviewFindings: false,
    canSubmitFindingsToCoordinator: false,
    canGenerateReport: false,
    canSendReportToPrakalpa: false,
    canSubmitCorrectiveAction: false,
    canVerifyCorrectiveAction: false,
    canManagePrakalpas: false,
    canManageAdmins: false,
  },

  prakalpa_manager: {
    role: "prakalpa_manager",
    canCreateAuditPlan: false,
    canScheduleAudit: false,
    canEditReport: false,
    canCloseReport: false,
    canViewAllReports: false,
    canManageRoles: false,
    canManageUsers: false,
    canViewDashboard: true,
    canAddAuditor: false,
    canAssignAuditCoordinator: false,
    canAssignAuditors: false,
    canAssignLeadAuditor: false,
    canSubmitFindings: false,
    canReviewFindings: false,
    canSubmitFindingsToCoordinator: false,
    canGenerateReport: false,
    canSendReportToPrakalpa: false,
    canSubmitCorrectiveAction: true,
    canVerifyCorrectiveAction: false,
    canManagePrakalpas: false,
    canManageAdmins: false,
  },
};

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }
function daysFuture(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; }

export const SEED_USERS: AppUser[] = [
  { id: "u-admin",  name: "Admin User",          email: "admin@rashtrotthana.org",        role: "admin",             active: true, createdDate: daysAgo(90) },
  { id: "u-la-1",  name: "Ananya Iyer",          email: "ananya.iyer@rashtrotthana.org",  role: "lead_auditor",      active: true, createdDate: daysAgo(80) },
  { id: "u-la-2",  name: "Priya Nair",           email: "priya.nair@rashtrotthana.org",   role: "lead_auditor",      active: true, createdDate: daysAgo(80) },
  { id: "u-ac-1",  name: "Deepa Menon",          email: "deepa.menon@rashtrotthana.org",  role: "audit_coordinator", active: true, createdDate: daysAgo(60), phone: "9845012345" },
  { id: "u-ac-2",  name: "Kiran Bhat",           email: "kiran.bhat@rashtrotthana.org",   role: "audit_coordinator", active: true, createdDate: daysAgo(55), phone: "9876543210" },
  { id: "u-ac-3",  name: "Suresh Kumar",         email: "suresh.kumar@rashtrotthana.org", role: "audit_coordinator", active: true, createdDate: daysAgo(50), phone: "9900112233" },
  { id: "u-aud-1", name: "Dr. Sarah Jenkins",    email: "sarah.jenkins@rashtrotthana.org",role: "auditor",           active: true, createdDate: daysAgo(70) },
  { id: "u-aud-2", name: "Rohan Mehra",          email: "rohan.mehra@rashtrotthana.org",  role: "auditor",           active: true, createdDate: daysAgo(65) },
  { id: "u-aud-3", name: "Vikram Singh",         email: "vikram.singh@rashtrotthana.org", role: "auditor",           active: true, createdDate: daysAgo(60) },
];

export const AUDIT_COORDINATORS = SEED_USERS.filter((u) => u.role === "audit_coordinator").map((u) => u.name);

export interface LeadAuditorProfile {
  id: string;
  name: string;
  email: string;
  prakalpas: string[];
}

export const LEAD_AUDITOR_PROFILES: LeadAuditorProfile[] = [
  { id: "u-la-1", name: "Ananya Iyer",  email: "ananya.iyer@rashtrotthana.org",  prakalpas: ["Yoga Kendra", "Blood Bank", "Training Centre"] },
  { id: "u-la-2", name: "Priya Nair",   email: "priya.nair@rashtrotthana.org",   prakalpas: ["School", "Community Centre"] },
];

const seedPlans: AuditPlan[] = [
  { id: "plan-1", iqaNumber: "IQAN261001", prakalpa: "Yoga Kendra", location: "Bengaluru", sublocation: "Jayanagar", auditPlannedDate: daysFuture(30), auditCoordinator: "Deepa Menon", auditCoordinatorId: "u-ac-1", auditAreas: ["Finance & Accounts", "Safety & Compliance"], prakalphaPramukh: "Suresh Babu K", auditors: ["Dr. Sarah Jenkins"], auditorIds: ["u-aud-1"], purpose: "Annual safety and compliance inspection.", createdDate: daysAgo(5), status: "pending",  },
];

const seedScheduled: ScheduledAudit[] = [
  { id: "sched-1", iqaNumber: "IQAN261004", startDate: daysAgo(2), endDate: daysFuture(5), auditors: ["Rohan Mehra"], leadAuditor: "Rohan Mehra", prakalpa: "Yoga Kendra", location: "Hyderabad", sublocation: "Mehdipatnam", purpose: "Vendor procurement compliance check.", auditPlannedDate: daysFuture(7), createdDate: daysAgo(10), scheduledDate: daysAgo(2), auditCoordinator: "Deepa Menon", prakalphaPramukh: "Ravi Kumar", auditAreas: ["Procurement", "Finance & Accounts"], mailSent: true,  },
];

const seedReports: Report[] = [
  {
    id: "rep-1", iarNumber: "IAR1001", iqrNumber: "IQR20261837492", iqaNumber: "IQAN261004",
    prakalpa: "Yoga Kendra", location: "Hyderabad", sublocation: "Mehdipatnam",
    auditor: "Rohan Mehra", auditCoordinator: "Deepa Menon", prakalphaPramukh: "Ravi Kumar", auditArea: "Finance & Accounts",
    visitDate: daysAgo(1), visitTime: "10:30 AM", createdDate: daysAgo(1),
    severity: "non_conformance", findings: "Vendor documentation missing for 3 contracts.", classificationStatus: "NC",
    correctiveAction: "", dueDate: daysFuture(30), proofFiles: ["vendor_contracts_scan.pdf"], hasChecklist: true, status: "open",
    observations: [
      { id: "obs-1-1", number: 1, area: "Finance & Accounts", severity: "non_conformance", finding: "Vendor documentation missing for 3 contracts.", correctiveAction: "", status: "open", dueDate: daysFuture(30) },
    ],
  },
];

interface AppContextType {
  currentUser: CurrentUser;
  refreshLiveData: () => Promise<void>;

  users: AppUser[];
  auditorUsers: AppUser[];
  coordinatorUsers: AppUser[];
  auditors: string[];

  leadAuditorProfiles: LeadAuditorProfile[];
  updateLeadAuditorProfile: (id: string, data: Partial<LeadAuditorProfile>) => Promise<void>;

  rolePermissions: Record<Role, RolePermission>;
  updateRolePermission: (role: Role, data: Partial<RolePermission>) => Promise<void>;

  auditPlans: AuditPlan[];
  scheduledAudits: ScheduledAudit[];
  reports: Report[];
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  getDaysOpen: (r: Report) => number;
  isRedFlagged: (r: Report) => boolean;
  isOverdue: (r: Report) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [
    authenticationReady,
    setAuthenticationReady,
  ] = useState(false);
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [leadAuditorProfiles, setLeadAuditorProfiles] = useState<LeadAuditorProfile[]>(LEAD_AUDITOR_PROFILES);
  const [rolePermissions, setRolePermissions] = useState<Record<Role, RolePermission>>(DEFAULT_ROLE_PERMISSIONS);
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>(seedPlans);
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>(seedScheduled);
  const [reports, setReports] = useState<Report[]>(seedReports);
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const loadLiveData = useCallback(async () => {
    try {
      const [plansRes, scheduledRes, reportsRes, usersRes, rolesRes] = await Promise.all([
        getAuditPlans().catch(() => seedPlans),
        getScheduledAudits().catch(() => seedScheduled),
        getReports().catch(() => seedReports),
        getUsers().catch(() => SEED_USERS),
        getRoles().catch(() => null),
      ]);

      const freshPlans = plansRes.data || plansRes || seedPlans;
      const freshScheduled = scheduledRes.data || scheduledRes || seedScheduled;
      const freshReports = reportsRes.data || reportsRes || seedReports;
      const freshUsers = usersRes.data || usersRes || SEED_USERS;

      setAuditPlans([...freshPlans]);
      setScheduledAudits([...freshScheduled]);
      setReports([...freshReports]);
      setUsers([...freshUsers]);

      if (rolesRes && Array.isArray(rolesRes)) {
        const mapped: Record<Role, RolePermission> = { ...DEFAULT_ROLE_PERMISSIONS };
        rolesRes.forEach((r: any) => {
          if (r.name && r.permissions) {
            mapped[r.name as Role] = { role: r.name, ...r.permissions };
          }
        });
        setRolePermissions(mapped);
      }
    } catch (error) {
      console.warn("Fallback to local dataset:", error);
    }
  }, []);

  /*
   * Resolve authenticated identity from the backend before
   * protected application data is loaded.
   *
   * Frontend demo identities are not authentication authorities.
   * Authenticated identity is resolved from the backend.
   */
  useEffect(() => {
    let cancelled = false;

    const bootstrapAuthentication =
      async () => {
        if (!hasAuthenticationToken()) {
          clearAuthenticatedSession();

          if (!cancelled) {
            window.location.replace("/login");
          }

          return;
        }

        try {
          const user =
            await getAuthenticatedUser();

          if (cancelled) {
            return;
          }

          setCurrentUser(
            user as CurrentUser
          );

          setAuthenticationReady(true);
        } catch (error) {
          console.warn(
            "Authentication validation failed:",
            error
          );

          clearAuthenticatedSession();

          if (!cancelled) {
            window.location.replace("/login");
          }
        }
      };

    void bootstrapAuthentication();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticationReady) {
      return;
    }

    void loadLiveData();
  }, [
    authenticationReady,
    loadLiveData,
  ]);

  const updateRolePermission = useCallback(async (role: Role, data: Partial<RolePermission>) => {
    const previousRolePerms = rolePermissions[role];
    const updatedRolePerms = {
      ...previousRolePerms,
      ...data,
    };

    setRolePermissions((prev) => ({
      ...prev,
      [role]: updatedRolePerms,
    }));

    try {
      await updateRoleApi(
        role,
        updatedRolePerms
      );
    } catch (err) {
      /*
       * Backend persistence is authoritative.
       * Roll back the optimistic UI update if persistence fails.
       */
      setRolePermissions((prev) => ({
        ...prev,
        [role]: previousRolePerms,
      }));

      console.error(
        "Role permission persistence failed:",
        err
      );

      throw err;
    }
  }, [rolePermissions]);

  const updateLeadAuditorProfile = useCallback(async (id: string, data: Partial<LeadAuditorProfile>) => {
    setLeadAuditorProfiles((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
  }, []);

  const auditorUsers = users.filter((u) => u.role === "auditor" && u.active);
  const coordinatorUsers = users.filter((u) => u.role === "audit_coordinator" && u.active);
  const auditors = auditorUsers.map((u) => u.name);

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    },
    []
  );

  const markAllNotificationsRead = useCallback(
    () => {
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    },
    []
  );

  const getDaysOpen = useCallback((r: Report) => r.status === "closed" ? 0 : Math.floor((Date.now() - new Date(r.createdDate).getTime()) / 86400000), []);
  const isRedFlagged = useCallback((r: Report) => r.severity === "non_conformance" && r.status === "open" && getDaysOpen(r) > 30, [getDaysOpen]);
  const isOverdue = useCallback((r: Report) => r.status !== "closed" && !!r.dueDate && new Date(r.dueDate) < new Date(), []);

  /*
   * Do not expose AppContext until the backend has resolved
   * the authenticated identity.
   *
   * Consumers therefore continue receiving a guaranteed
   * non-null CurrentUser.
   */
  if (!authenticationReady || !currentUser) {
    return null;
  }

  return (
    <AppContext.Provider value={{
      currentUser, refreshLiveData: loadLiveData,
      users, auditorUsers, coordinatorUsers, auditors,
      leadAuditorProfiles, updateLeadAuditorProfile,
      rolePermissions, updateRolePermission,
      auditPlans, scheduledAudits, reports, notifications,
      markNotificationRead, markAllNotificationsRead,
      getDaysOpen, isRedFlagged, isOverdue,
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
