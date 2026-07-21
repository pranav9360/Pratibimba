# Pratibimba — Audit Management Platform
## Frontend Summary Document
**Date:** July 21, 2026  
**Stack:** React 18 + Vite, Wouter (routing), Tailwind CSS, TypeScript

---

## 1. Overview

**Pratibimba** is an Internal Quality Audit (IQA) management platform designed for organisations that conduct structured audits across domains (Yoga Kendra, Prakalpa, etc.) and locations. The frontend is a single-page application (SPA) built with React and Wouter, consuming a shared in-memory state context that simulates a real API backend. All data lives in `app-context.tsx` and is ready to be swapped out for real API calls once the backend is ready.

---

## 2. Roles & Access Model

Five roles are defined across the system, each with different levels of access and responsibility:

| Role | Internal Key | Responsibilities |
|---|---|---|
| **Admin** | `admin` | Administers the platform — manages users, assigns roles, sets email addresses, controls access |
| **Lead Auditor** | `lead_auditor` | Creates audit plans, assigns Audit Coordinators and Auditor teams, manages role permissions |
| **Audit Coordinator** | `audit_coordinator` | Leads field audit teams, manages scheduled audits, edits and closes reports |
| **Auditor** | `auditor` | Part of the field team; read-only access on reports, creates reports for assigned audits |
| **Prakalpa Manager** | `prakalpa_manager` | Views and responds to reports within their own domain |

### Role-Based Navigation
Navigation items in the sidebar are filtered per role. For example:
- **Admin** exclusively sees User Management
- **Lead Auditor** sees Audit Plan and Role Access
- **Audit Coordinator** sees Scheduled Audits, All Reports, Open Reports
- **Prakalpa Manager** sees reports scoped to their domain

---

## 3. Application Architecture

### Entry Point & Routing (`App.tsx` + Wouter)

```
/ (root)           → Redirects to /dashboard (if logged in) or /login
/login             → Login page (public)
/forgot-password   → Forgot Password page (public)
/otp-verification  → OTP Verification page (public)
/reset-password    → Reset Password page (public)

─── Authenticated (DashboardLayout) ──────────────────
/dashboard              → Summary dashboard
/audit-plan             → Audit Plan management
/audit-calendar         → Audit Calendar view
/scheduled-audits       → Scheduled Audits list
/all-reports            → All IAR reports
/open-reports           → Open/pending reports
/create-report/:id      → Create report for a scheduled audit
/iqa-summary            → IQA Summary (tabular overview)
/role-access            → Role & permission management
/user-management        → User CRUD (Admin only)
```

The `DashboardLayout` wraps all authenticated pages with the `SideNav` (left) and `TopNav` (top bar). Public pages (login, OTP, etc.) are rendered without the layout.

### Global State (`context/app-context.tsx`)

All application state is managed through a single React Context. Key entities:

- **`AppUser`** — platform user with `id`, `name`, `email`, `role`, `domain`, `status`
- **`AuditPlan`** — a proposed audit with domain, location, coordinator, auditors, dates, purpose; status: `pending` | `scheduled`
- **`ScheduledAudit`** — a confirmed audit engagement with actual start/end dates, team, and progress tracking
- **`Report`** — an IAR/IQR report linked to a scheduled audit, with status `open` | `closed`
- **`Observation`** — individual finding within a report; `non_conformance` (NC) or `open_for_improvement` (OFI) with corrective actions, due dates, and proof files

Context exposes actions: `createAuditPlan`, `updateAuditPlan`, `deleteAuditPlan`, `scheduleAudit`, `updateReport`, `addObservationCorrectiveAction`, `addUser`, `updateUser`, `updateLeadAuditorProfile`, etc.

---

## 4. Pages — Detailed Breakdown

### 4.1 Dashboard (`/dashboard`)
A high-level executive summary of audit health.

**Key features:**
- Domain Coverage ring/progress chart (domains audited vs. total)
- Summary stat cards: Total Audits, Reports, Open NCs, Open OFIs
- NC vs. OFI closure rate indicators
- Severity breakdown (Critical / Major / Minor / OFI)
- Recent Reports list (last 5 with status)
- Pending Plans panel
- Upcoming Scheduled Audits panel

---

### 4.2 Audit Plan (`/audit-plan`)
Where Lead Auditors define upcoming audit intentions before they are formally scheduled.

**Key features:**
- Create / Edit / Delete audit plans via modal form
- Fields: Domain, Location, Sub-location, Date range, Audit Coordinator (dropdown from `audit_coordinator` role users), Auditor team (multi-select), Purpose
- Filter bar: by Domain, Location, Coordinator, Status
- CSV export of filtered plans
- "Schedule" action converts a `pending` plan into a `ScheduledAudit`
- Delete confirmation modal
- Role gate: only `lead_auditor` can create/edit/delete; others are read-only

---

### 4.3 Audit Calendar (`/audit-calendar`)
Visual timeline representation of all audit activity.

**Key features:**
- Month view grid with events colour-coded by type (Planned = blue, Scheduled = green)
- List view alternative for accessibility
- Upcoming Events panel (next 30 / 60 / 90 day filter)
- Click-through to audit detail

---

### 4.4 Scheduled Audits (`/scheduled-audits`)
Tracks confirmed, in-progress audit engagements.

**Key features:**
- Card/list view per scheduled audit showing Audit ID, Domain, Location, Team, Date range
- Progress bar under each card showing completion status
- Lead Auditor can edit schedule details (dates, team)
- Auditor view is scoped — only sees audits they are assigned to
- Link to Create Report for each scheduled audit

---

### 4.5 All Reports (`/all-reports`)
The central repository of all submitted IAR (Internal Audit Reports).

**Key features:**
- Multi-criteria filter: Domain, Status, Coordinator, Date range, Search text
- Report cards showing IQA number, domain, auditor, NC/OFI counts, open/closed status
- **Red-flag highlighting** — automatically flags NCs older than 30 days
- Detail modal: shows all observations with corrective actions, due dates, and proof files
- Numbered observations per report
- Add corrective action inline
- Close observation with evidence confirmation
- Prakalpa Manager view is scoped to their domain only
- CSV export

---

### 4.6 Open Reports (`/open-reports`)
A focused, action-oriented view of reports that still require work.

**Key features:**
- Filters to NC-only or OFI-only findings
- Badges: **Overdue** (past due date), **Red Flagged** (>30 days open)
- Observation detail modal with corrective action entry
- Role-based edit gating: Auditor and Admin are read-only; Coordinator and Lead Auditor can act

---

### 4.7 Create Report (`/create-report/:id`)
Form for Auditors and Coordinators to submit findings against a scheduled audit.

**Key features:**
- Pre-fills Audit Coordinator and Auditor name from the scheduled audit + current user
- Visit date/time picker
- Observation entry: area, description, severity (NC / OFI), classification
- Evidence file upload per observation
- Optional checklist confirmation
- Submit creates a new Report linked to the ScheduledAudit

---

### 4.8 IQA Summary (`/iqa-summary`)
A comprehensive tabular overview of all audits and their cumulative outcomes.

**Key features:**
- Master table: one row per audit, expandable to show individual reports
- Summary columns: Audit Days, Total NCs, Open NCs, Total OFIs, Open OFIs, Closure Rate
- Nested row structure for reports under each audit
- Filter by domain, date, status
- Specialised CSV export that includes both audit-level and report-level data
- Color-coded status columns (on-time vs. overdue closure)

---

### 4.9 Role Access (`/role-access`)
Permission matrix and Lead Auditor domain assignment management.

**Key features:**
- Permission grid: rows = features, columns = 5 roles; toggle switches per cell
- Role overview cards at the top showing role description and user count
- Lead Auditor domain assignment editor (which domains each LA is responsible for)
- Admin-only visibility for write actions; Lead Auditor can view

---

### 4.10 User Management (`/user-management`)
Admin-only page for managing platform users.

**Key features:**
- List of all users with name, email, role badge, domain, status (Active / Inactive)
- Filter by role, search by name/email
- Add User modal: name, email, role, domain, status
- Edit User inline
- Activate / Deactivate toggle
- **Access Restricted** message shown to all non-admin roles

---

### 4.11 Authentication Pages
Standard public pages forming the auth flow:

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Email + password entry |
| Forgot Password | `/forgot-password` | Email submission to trigger OTP |
| OTP Verification | `/otp-verification` | 6-digit OTP entry with 60-second resend countdown |
| Reset Password | `/reset-password` | New password + confirm entry |

---

## 5. Shared Components

### `SideNav` (`components/side-nav.tsx`)
- Collapsible left sidebar
- Nav items filtered by `currentUser.role`
- Shows current user's name, role label, and domain at the bottom
- "Add User" shortcut visible to Admin only

### `TopNav` (`components/top-nav.tsx`)
- Breadcrumb navigation based on current route
- **Role Switcher** (demo feature): dropdown listing all 13 `DEMO_USERS` grouped by role, enabling instant user switching for demonstration purposes
- **Notification Bell**: shows unread alerts (scheduled audits, system messages)

### `StatusPill` (`components/status-pill.tsx`)
- Standardised badge for: `Pending`, `Verified`, `Failed`, `Escalated`, `In Review`, `Open`, `Closed`
- `PriorityBadge` variant for: Low / Medium / High

### UI Library (`components/ui/`)
Full shadcn/ui-compatible component library including:
`Button`, `Card`, `Dialog`, `Table`, `Select`, `Input`, `Badge`, `Checkbox`, `Calendar`, `Progress`, `Tabs`, `Sheet`, `Tooltip`, `Avatar`, `Skeleton`, `Sidebar`, and more.

---

## 6. Demo Users

Thirteen demo users are seeded across all five roles for testing:

| Role | Sample Users |
|---|---|
| Admin | Admin User |
| Lead Auditor | Ananya Iyer, Dr. Mehta, Sarah Jenkins |
| Audit Coordinator | Ravi Kumar, Vikram Singh, Marcus Thorne |
| Auditor | Priya Nair, Anita Rao, Rohan Mehra |
| Prakalpa Manager | Domain-specific managers |

Users can be switched at any time via the role switcher in the top-right corner.

---

## 7. Data Taxonomy

### Domains
Yoga Kendra, Prakalpa, and other organisational domains.

### Locations & Sub-locations
Hierarchical — each Domain has one or more Locations, each Location has Sub-locations.

### Audit Areas
Predefined list of audit areas mapped to domains (e.g., HR & Administration, Finance, Operations).

---

## 8. Current State & What's Ready

| Area | Status |
|---|---|
| Authentication flow (Login → OTP → Reset) | ✅ Complete |
| Role-based navigation & access control | ✅ Complete |
| Audit Plan creation, editing, deletion, scheduling | ✅ Complete |
| Audit Calendar (month + list view) | ✅ Complete |
| Scheduled Audits tracking | ✅ Complete |
| Report submission (Create Report) | ✅ Complete |
| All Reports — filtering, red-flag, corrective actions | ✅ Complete |
| Open Reports — overdue/red-flag focus view | ✅ Complete |
| IQA Summary — tabular with nested rows | ✅ Complete |
| Role Access — permission matrix + LA domain assignment | ✅ Complete |
| User Management — Admin CRUD | ✅ Complete |
| Dashboard — metrics, charts, recent activity | ✅ Complete |
| TypeScript — zero errors | ✅ Clean |

---

## 9. What's Not Yet Connected

The frontend currently uses **in-memory mock data** from `app-context.tsx`. The following will need to be wired to the backend API when ready:

- User authentication (login, OTP verification, session management)
- Persistent storage of Audit Plans, Scheduled Audits, Reports, Observations
- File uploads for evidence/proof attachments
- Email notifications to Audit Coordinators and teams when a plan is assigned
- Real-time notification delivery (currently simulated in the bell icon)

---

*This document reflects the state of the Pratibimba frontend as of July 21, 2026.*
