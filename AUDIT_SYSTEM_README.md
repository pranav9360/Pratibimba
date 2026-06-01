# Pratibimba Audit Management System

A comprehensive, unified audit management system built with Next.js, Drizzle ORM, and PostgreSQL (Neon).

## Features Overview

The system consolidates all audit management functionality in a single, intuitive interface with the following sections:

### 1. **Dashboard**
- High-level overview of all audit activities
- Key metrics: Total Audit Plans, Scheduled Audits, Total Reports, Open Reports
- Non-conformances by Prakalpa
- Auditor workload distribution
- Real-time statistics and summaries

### 2. **Audit Plan** (Chief Auditor - Create)
- Create new audit plans with auto-generated **IQA Numbers** (format: `IQA2026XXXXXX`)
- Assign location (Prakalpa) and auditor
- Define audit type and expected timeline
- Add audit purpose/description
- Filter by Prakalpa, Auditor, and Status
- Move to scheduled audits with the "Schedule" button

### 3. **Scheduled Audits** (Edit & Update)
- View all scheduled audits in card format
- Update start and end dates
- Finalize auditor assignment
- Quick access to create reports
- Status indicators (In Progress, Scheduled, Overdue)
- Statistics: Total, Upcoming, In-Progress, Overdue

### 4. **Create Report** (Auditors)
- Select a scheduled audit to create a report
- Auto-generated **IQR Numbers** (format: `IQR2026YYYYYYY`)
- Record visit time
- Add findings with classification:
  - Open for Improvement
  - Non-Conformance
- Severity levels: Low, Medium, High
- Proof/Evidence upload support (structure ready)
- Optional audit report checklist upload
- Add multiple findings per report

### 5. **All Reports** (View & Manage)
- View all audit reports with comprehensive details
- **Report Status**: Draft, Open, Closed
- **Days Open Tracking**: Automatically calculated
- **Color-coded alerts**: Red for non-conformances open >30 days
- Filter by Status, Prakalpa, Auditor, and Date
- Expandable row view to see finding details
- Finding count: Non-Conformances (NC) and Open for Improvement (OI)
- Download functionality ready for Excel/CSV export

### 6. **IQA Summary** (Audit Overview)
- Horizontal summary view of all audits
- Shows: IQA Number, Report Number, Audit Date, Report Generation Date
- Quick metrics: NC count, OI count
- Click-to-expand for full details
- Detailed findings table in expanded view
- Download option for multiple audits as Excel/CSV
- Accessible by Auditors and Chief Auditors

## Database Schema

### Core Tables:

```
prakalpas
├── id (PK)
├── name (Unique)
├── location
└── description

auditors
├── id (PK)
├── name
├── email
├── phone
├── department
└── isActive

audit_plans
├── id (PK)
├── auditNumber (IQA format, Unique)
├── prakalpaaId (FK)
├── auditorId (FK)
├── auditType
├── tentativeStartDate
├── tentativeEndDate
├── scheduledStartDate
├── scheduledEndDate
├── status (planned/scheduled/completed)
└── description

audit_reports
├── id (PK)
├── auditPlanId (FK)
├── reportNumber (IQR format, Unique)
├── status (draft/open/closed)
├── generatedAt
└── findingsSummary

findings
├── id (PK)
├── reportId (FK)
├── classification (open-for-improvement/non-conformance)
├── description
├── severity (low/medium/high)
├── status (open/closed)
└── closureDate

proof_documents
├── id (PK)
├── findingId (FK)
├── fileName
├── filePath
└── fileType
```

## Auto-Generation

### IQA Number (Audit Plan)
Format: `IQA{YEAR}{RANDOM_STRING}`
- Example: `IQA2026ABCD12`
- Generated when creating an audit plan
- Unique identifier for tracking audits

### IQR Number (Report)
Format: `IQR{YEAR}{RANDOM_STRING}`
- Example: `IQR2026XYZA34`
- Generated when creating an audit report
- Unique identifier for tracking reports

## Access & Navigation

### Main Entry Point
```
/dashboard/unified-audit
```

All functionality is available from a single tabbed interface:
- Dashboard
- Audit Plan
- Scheduled Audits
- Create Report
- All Reports
- IQA Summary

## Filtering Capabilities

All sections include filtering by:
- **Prakalpa** (Location)
- **Auditor** (Name)
- **Status** (Relevant to section)
- **Date Range** (In reports section)

## Server Actions

All data operations are handled through server actions in:
```
/app/actions/audits.ts
```

### Available Actions:
- `getPrakalpas()` - Get all locations
- `getAuditors()` - Get all auditors
- `getAuditPlans()` - Get all audit plans
- `getScheduledAudits()` - Get scheduled audits only
- `createAuditPlan()` - Create new audit plan
- `scheduleAudit()` - Move plan to scheduled
- `getAuditReports()` - Get all reports
- `createAuditReport()` - Create new report
- `createFinding()` - Add finding to report
- `updateFindingStatus()` - Update finding status
- `getAuditReportsWithDetails()` - Get reports with nested data
- `getAllAuditData()` - Get complete dataset for dashboard

## Development Features

### Current Status
- ✅ Complete UI with all 6 sections
- ✅ Database schema with Drizzle ORM
- ✅ Server actions for all CRUD operations
- ✅ Auto-generation of IQA and IQR numbers
- ✅ Filtering and search functionality
- ✅ Status tracking and color coding
- ✅ Days-open calculations
- ✅ Responsive design with Tailwind CSS
- ⏳ Proof document upload (structure ready, needs file handler)
- ⏳ Excel/CSV export (structure ready, needs export library)
- ⏳ Notification system (structure ready, needs notification service)
- ⏳ Role-based access control (ready for implementation)

## File Structure

```
app/
├── (dashboard)/
│   └── unified-audit/
│       └── page.tsx          (Main audit management page)
├── actions/
│   └── audits.ts            (Server actions)
└── api/
    └── [auth routes]

lib/
├── db/
│   ├── index.ts            (Drizzle client)
│   └── schema.ts           (Database schema)
├── auth.ts                 (Authentication - optional)
├── auth-client.ts          (Auth client - optional)
└── utils.ts                (Helper functions)

components/
└── side-nav.tsx            (Navigation component)
```

## Quick Start

1. **Navigate to Audit Management:**
   ```
   /dashboard/unified-audit
   ```

2. **Create Audit Plan:**
   - Go to "Audit Plan" tab
   - Fill in the form (Prakalpa, Auditor, Type, Dates, Purpose)
   - Auto-generated IQA number is created on submission

3. **Schedule Audit:**
   - Go to "Scheduled Audits" tab
   - Select an unscheduled audit
   - Set start and end dates
   - Click "Schedule Audit"

4. **Create Report:**
   - Go to "Create Report" tab
   - Select a scheduled audit
   - Record visit time
   - Add findings (classification, description, severity)
   - Click "Create Report"

5. **View & Manage Reports:**
   - Go to "All Reports" tab
   - See all reports with status and timeline
   - Click "View" to see finding details
   - Filter by status, prakalpa, auditor

6. **IQA Summary:**
   - Go to "IQA Summary" tab
   - See all audits in expandable cards
   - Click to see detailed findings
   - Download option available

## Future Enhancements

1. **File Upload System**
   - Integrate Vercel Blob for proof documents
   - Upload checklist PDFs

2. **Export Functionality**
   - CSV export using libraries like `papaparse`
   - Excel export using `xlsx` library

3. **Notifications**
   - Email notifications for overdue reports
   - In-app notifications for audit assignments

4. **Role-Based Access**
   - Chief Auditor: Full access
   - Auditors: Limited to their audits
   - Prakalpa Managers: View reports only for their location

5. **Advanced Analytics**
   - Trend analysis
   - Non-conformance patterns
   - Auditor performance metrics

6. **Audit History & Versioning**
   - Track changes to audit plans
   - Revision history for reports

7. **Integration**
   - Calendar integration for dates
   - Email notifications
   - API endpoints for external systems

## Notes

- All dates are stored in the database and displayed in user's local timezone
- Color coding: Red for overdue, Green for closed, Yellow for open
- System automatically calculates days open for non-conformances
- All filtering is done on the client side after data fetch (ready for optimization)
- Database queries are optimized with proper indexing
