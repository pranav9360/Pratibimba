import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  date,
  integer,
  varchar,
} from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- Audit Management App Tables -------------------------------------------

export const prakalpas = pgTable('prakalpas', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditors = pgTable('auditors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }),
  department: varchar('department', { length: 255 }),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditPlans = pgTable('audit_plans', {
  id: serial('id').primaryKey(),
  auditNumber: varchar('audit_number', { length: 50 }).notNull().unique(),
  prakalpaaId: integer('prakalpa_id').notNull(),
  auditorId: integer('auditor_id').notNull(),
  auditType: varchar('audit_type', { length: 50 }).notNull(),
  tentativeStartDate: date('tentative_start_date'),
  tentativeEndDate: date('tentative_end_date'),
  scheduledStartDate: date('scheduled_start_date'),
  scheduledEndDate: date('scheduled_end_date'),
  status: varchar('status', { length: 50 }).notNull().default('planned'),
  description: text('description'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditReports = pgTable('audit_reports', {
  id: serial('id').primaryKey(),
  auditPlanId: integer('audit_plan_id').notNull(),
  reportNumber: varchar('report_number', { length: 50 }).unique(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  generatedAt: timestamp('generated_at'),
  findingsSummary: text('findings_summary'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const findings = pgTable('findings', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').notNull(),
  classification: varchar('classification', { length: 50 }).notNull(),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  closureDate: date('closure_date'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const proofDocuments = pgTable('proof_documents', {
  id: serial('id').primaryKey(),
  findingId: integer('finding_id').notNull(),
  fileName: varchar('file_name', { length: 255 }),
  filePath: varchar('file_path', { length: 255 }),
  fileType: varchar('file_type', { length: 50 }),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
