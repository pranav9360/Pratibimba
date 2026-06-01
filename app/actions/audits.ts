'use server'

import { db } from '@/lib/db'
import {
  auditPlans,
  auditReports,
  findings,
  prakalpas,
  auditors,
  proofDocuments,
} from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// PRAKALPAS (Locations)
export async function getPrakalpas() {
  return db.select().from(prakalpas).orderBy(asc(prakalpas.name))
}

export async function createPrakalpa(data: {
  name: string
  location?: string
  description?: string
}) {
  const result = await db
    .insert(prakalpas)
    .values(data)
    .returning()
  revalidatePath('/dashboard/audits')
  return result[0]
}

// AUDITORS
export async function getAuditors() {
  return db.select().from(auditors).orderBy(asc(auditors.name))
}

export async function createAuditor(data: {
  name: string
  email?: string
  phone?: string
  department?: string
}) {
  const result = await db
    .insert(auditors)
    .values(data)
    .returning()
  revalidatePath('/dashboard/audits')
  return result[0]
}

// AUDIT PLANS
export async function getAuditPlans() {
  return db
    .select()
    .from(auditPlans)
    .orderBy(desc(auditPlans.createdAt))
}

export async function getScheduledAudits() {
  return db
    .select()
    .from(auditPlans)
    .where(eq(auditPlans.status, 'scheduled'))
    .orderBy(desc(auditPlans.scheduledStartDate))
}

export async function createAuditPlan(data: {
  auditNumber: string
  prakalpaaId: number
  auditorId: number
  auditType: string
  tentativeStartDate?: string
  tentativeEndDate?: string
  description?: string
}) {
  const result = await db
    .insert(auditPlans)
    .values({
      ...data,
      status: 'planned',
    })
    .returning()
  revalidatePath('/dashboard/audit-plan')
  return result[0]
}

export async function scheduleAudit(
  auditPlanId: number,
  data: {
    scheduledStartDate: string
    scheduledEndDate: string
  }
) {
  const result = await db
    .update(auditPlans)
    .set({
      ...data,
      status: 'scheduled',
    })
    .where(eq(auditPlans.id, auditPlanId))
    .returning()
  revalidatePath('/dashboard/scheduled-audits')
  return result[0]
}

// AUDIT REPORTS
export async function getAuditReports() {
  return db
    .select()
    .from(auditReports)
    .orderBy(desc(auditReports.createdAt))
}

export async function createAuditReport(data: {
  auditPlanId: number
  reportNumber: string
}) {
  const result = await db
    .insert(auditReports)
    .values({
      ...data,
      status: 'draft',
      generatedAt: new Date(),
    })
    .returning()
  revalidatePath('/dashboard/reports')
  return result[0]
}

export async function updateAuditReportStatus(
  reportId: number,
  status: string
) {
  const result = await db
    .update(auditReports)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(auditReports.id, reportId))
    .returning()
  revalidatePath('/dashboard/reports')
  return result[0]
}

// FINDINGS
export async function getFindingsByReport(reportId: number) {
  return db
    .select()
    .from(findings)
    .where(eq(findings.reportId, reportId))
    .orderBy(desc(findings.createdAt))
}

export async function createFinding(data: {
  reportId: number
  classification: string
  description: string
  severity?: string
}) {
  const result = await db
    .insert(findings)
    .values(data)
    .returning()
  revalidatePath('/dashboard/reports')
  return result[0]
}

export async function updateFindingStatus(
  findingId: number,
  status: string,
  closureDate?: string
) {
  const result = await db
    .update(findings)
    .set({
      status,
      ...(closureDate && { closureDate }),
      updatedAt: new Date(),
    })
    .where(eq(findings.id, findingId))
    .returning()
  revalidatePath('/dashboard/reports')
  return result[0]
}

// PROOF DOCUMENTS
export async function createProofDocument(data: {
  findingId: number
  fileName: string
  filePath: string
  fileType: string
}) {
  const result = await db
    .insert(proofDocuments)
    .values(data)
    .returning()
  revalidatePath('/dashboard/reports')
  return result[0]
}

export async function getProofDocuments(findingId: number) {
  return db
    .select()
    .from(proofDocuments)
    .where(eq(proofDocuments.findingId, findingId))
    .orderBy(desc(proofDocuments.uploadedAt))
}

// GET REPORTS WITH AUDIT PLAN DETAILS
export async function getAuditReportsWithDetails() {
  const reports = await db
    .select()
    .from(auditReports)
    .orderBy(desc(auditReports.createdAt))
  
  const enriched = await Promise.all(
    reports.map(async (report) => {
      const plan = await db
        .select()
        .from(auditPlans)
        .where(eq(auditPlans.id, report.auditPlanId))
        .limit(1)
      
      const auditFindings = await db
        .select()
        .from(findings)
        .where(eq(findings.reportId, report.id))
      
      return {
        ...report,
        plan: plan[0],
        findings: auditFindings,
      }
    })
  )
  
  return enriched
}

// GET ALL DATA FOR DASHBOARD
export async function getAllAuditData() {
  const [plans, scheduled, reports, prakalpasData, auditorsData] = await Promise.all([
    getAuditPlans(),
    getScheduledAudits(),
    getAuditReportsWithDetails(),
    getPrakalpas(),
    getAuditors(),
  ])
  
  return {
    plans,
    scheduled,
    reports,
    prakalpas: prakalpasData,
    auditors: auditorsData,
  }
}
