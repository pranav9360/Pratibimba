# Sidebar Navigation Guide - Pratibimba Audit Management

## Visual Navigation Structure

```
┌─────────────────────────────────────┐
│  Pratibimba                         │
│  AUDIT MANAGEMENT                   │
├─────────────────────────────────────┤
│                                     │
│  📊 Dashboard                        │  ← Main Overview
│                                     │
│  📋 Audit Plan                       │  ← Create Plans
│                                     │
│  📅 Scheduled Audits                 │  ← Manage Schedule
│                                     │
│  📈 All Reports                      │  ← View Reports
│                                     │
│  📝 IQA Summary                      │  ← Audit Summary
│                                     │
├─────────────────────────────────────┤
│  [➕ New Audit Plan]                 │  ← Quick Action
└─────────────────────────────────────┘
```

---

## 1️⃣ Dashboard Section
**Icon**: 📊 (analytics)
**Route**: `/dashboard`
**Purpose**: System overview and metrics

### Features:
- Real-time metrics
- KPI tracking
- Quick stats cards
- Navigation to other sections
- Recent activity feed

### Key Metrics Shown:
- Total number of Prakalpas
- Total audits planned
- Non-conformance percentage
- Audit closure rate
- Scheduled audits count
- Overdue audits (with red alert)
- Pending reports

---

## 2️⃣ Audit Plan Section
**Icon**: 📋 (event_note)
**Route**: `/dashboard/audit-plan`
**Purpose**: Create and manage audit plans

### Features:
- Create new audit plans
- Auto-generate IQA numbers (IQA202400XXXXX format)
- Select location, auditor, type
- Set tentative dates
- View all plans in table format
- Filter and search capabilities
- Status tracking

### Form Fields:
```
┌─ Create New Audit Plan ──────────────┐
│                                      │
│  Location/Prakalpa (Dropdown)        │
│  Auditor (Dropdown)                  │
│  Audit Type (Dropdown)               │
│  Start Date (Date Picker)            │
│  End Date (Date Picker)              │
│  Purpose/Description (Text)          │
│                                      │
│  [Create Audit Plan Button]          │
└──────────────────────────────────────┘
```

---

## 3️⃣ Scheduled Audits Section
**Icon**: 📅 (calendar_today)
**Route**: `/dashboard/scheduled-audits`
**Purpose**: Manage scheduled audits with timeline tracking

### Features:
- View all scheduled audits
- Card-based layout
- Days remaining tracker
- Status indicators
- Color-coded alerts
- Quick "Write Report" button
- Timeline information

### Card Information:
```
┌─ Audit Card ─────────────────┐
│  IQA202400001                │
│  Main Office                 │
│                              │
│  Auditor: John Smith         │
│  Type: System                │
│  Date: 06/10/2026           │
│                              │
│  8 days remaining            │
│                              │
│  [Write Report Button]       │
└──────────────────────────────┘
```

### Status Colors:
- 🟦 **Scheduled** (Blue) - Upcoming
- 🟩 **In Progress** (Green) - Currently running
- 🟧 **Completed** (Gray) - Finished
- 🟥 **Overdue** (Red) - Past end date

---

## 4️⃣ All Reports Section
**Icon**: 📈 (assessment)
**Route**: `/dashboard/all-reports`
**Purpose**: Comprehensive audit report management

### Features:
- List all generated reports
- Filter by status
- Filter by date range
- View findings per report
- Finding classification display
- Report details and summaries
- Multi-select options
- Export capabilities

### Report Information:
```
┌─ Report Card ──────────────────┐
│  IQR202400001                  │
│  Status: Open                  │
│  Created: 06/15/2026           │
│                                │
│  Findings:                     │
│  • Non-Conformances: 3         │
│  • Opportunities: 2            │
│  • Open: 5                     │
│  • Closed: 0                   │
│                                │
│  [View Details Button]         │
└────────────────────────────────┘
```

---

## 5️⃣ IQA Summary Section
**Icon**: 📝 (summarize)
**Route**: `/dashboard/iqa-summary`
**Purpose**: Complete audit summaries and analysis

### Features:
- Audit overview cards
- Finding statistics
- Status breakdown (Open/Closed)
- Expandable audit details
- Historical data
- Complete audit context
- Timeline view

### Summary Card:
```
┌─ Audit Summary Card ──────────┐
│  IQA202400001                 │
│                               │
│  Status: Scheduled            │
│  Location: Main Office        │
│  Type: System                 │
│                               │
│  Findings Summary:            │
│  ┌─────────────────────────┐  │
│  │ Total: 5                │  │
│  │ Open: 4                 │  │
│  │ Closed: 1               │  │
│  │ Critical: 2             │  │
│  └─────────────────────────┘  │
│                               │
│  [Expand for Details ▼]       │
└───────────────────────────────┘
```

---

## Color Scheme & Styling

### Primary Colors:
- **Orange (#a33900)**: Buttons, key actions
- **Blue (#4059aa)**: Sidebar, active states, accents
- **Red (#bb0112)**: Alerts, overdue, errors
- **Cream (#f8f9ff)**: Backgrounds

### Active Navigation Item:
```
┌────────────────────────────────┐
│█ ← Left border (Orange accent) │
│  📊 Dashboard                  │
│  (White background/opacity)    │
│  (Bold text)                   │
└────────────────────────────────┘
```

### Hover State:
```
┌────────────────────────────────┐
│  📊 Dashboard                  │
│  (Subtle bg change)            │
│  (Smooth transition)           │
└────────────────────────────────┘
```

---

## Navigation Flow

### User Journey Examples:

#### Create an Audit Plan:
```
Dashboard → Audit Plan → [Fill Form] → Create Plan → ✅ Success
```

#### Execute an Audit:
```
Dashboard → Scheduled Audits → [Select Audit] → Write Report → All Reports
```

#### View Audit Summary:
```
Dashboard → IQA Summary → [Select Audit] → [Expand] → View Details
```

#### Track Overdue:
```
Dashboard → [See Overdue Count] → Scheduled Audits → [Red Cards]
```

---

## Quick Actions

### Bottom Sidebar Button:
```
┌─────────────────────────────────┐
│  ┌ New Audit Plan              │
│  │ [➕ New Audit Plan]          │
│  │                              │
│  └─ Links to: /audit-plan     │
└─────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (> 1024px):
- Sidebar: Full width (260px)
- Navigation: All text visible
- Icons + Labels displayed
- Smooth transitions

### Tablet (640px - 1024px):
- Sidebar: Standard width
- Navigation: All items visible
- Touch-friendly sizing
- Optimized spacing

### Mobile (< 640px):
- Sidebar: Collapsible/hamburger menu
- Navigation: Stacked vertically
- Icons prominent
- Mobile-optimized

---

## Material Design 3 Alignment

✅ **Design System**: Material Design 3
✅ **Color Tokens**: Proper semantic colors
✅ **Typography**: Headline/Body/Label scale
✅ **Spacing**: Consistent 4px/8px grid
✅ **Elevation**: Subtle shadow system
✅ **Interactions**: Smooth transitions
✅ **Icons**: Material Symbols Outlined

---

## Navigation Tips

### For New Users:
1. Start on **Dashboard** for overview
2. Go to **Audit Plan** to create an audit
3. Check **Scheduled Audits** for upcoming items
4. View **All Reports** for completed audits
5. Use **IQA Summary** for audit details

### For Daily Use:
- Quick navigation via sidebar
- Use bottom "New Audit Plan" button for common task
- Icons are visual shortcuts
- Breadcrumb at top shows current section
- Search bar for quick access

### For Managers:
- **Dashboard**: See all metrics
- **All Reports**: Track compliance
- **IQA Summary**: Historical analysis
- **Scheduled Audits**: Timeline management

---

## Visual Hierarchy

```
Header
├─ Breadcrumb
├─ Search
└─ User Profile

Sidebar (Fixed)
├─ Brand Logo
├─ Nav Items (5)
└─ Action Button

Main Content
├─ Page Header
├─ Filters/Controls
└─ Content Area
```

---

## Professional Design Features

✨ **Clean Navigation**: Clear visual hierarchy
✨ **Consistent Styling**: Unified design language
✨ **Intuitive Layout**: Logical organization
✨ **Visual Feedback**: Clear active states
✨ **Accessibility**: Proper ARIA labels
✨ **Responsive**: Works on all devices
✨ **Professional**: Enterprise-grade appearance

---

**This 5-section navigation structure provides a clean, organized, and professional interface for managing audit systems.** 🎉
