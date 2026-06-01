'use client'

import { useState, useEffect } from 'react'
import {
  getAuditPlans,
  getAuditReports,
  getFindingsByReport,
} from '@/app/actions/audits'

interface AuditPlan {
  id: number
  auditNumber: string
  auditType: string
  status: string
  createdAt: Date
}

interface AuditReport {
  id: number
  auditPlanId: number
  reportNumber?: string | null
  status: string
  generatedAt?: Date | null
  createdAt: Date
}

interface Finding {
  id: number
  reportId: number
  classification: string
  status: string
  description: string
}

interface AuditSummary {
  plan: AuditPlan
  report?: AuditReport
  findings: Finding[]
  findingCount: number
  openFindings: number
  closedFindings: number
}

export default function IQASummaryPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [plansData, reportsData] = await Promise.all([
          getAuditPlans(),
          getAuditReports(),
        ])

        // Create a map of reports by audit plan ID
        const reportsByPlan: Record<number, AuditReport> = {}
        reportsData.forEach((report) => {
          if (!reportsByPlan[report.auditPlanId]) {
            reportsByPlan[report.auditPlanId] = report
          }
        })

        // Load findings for each report
        const summaries: AuditSummary[] = []
        for (const plan of plansData) {
          const report = reportsByPlan[plan.id]
          const findings = report ? await getFindingsByReport(report.id) : []

          summaries.push({
            plan,
            report,
            findings,
            findingCount: findings.length,
            openFindings: findings.filter((f) => f.status === 'open').length,
            closedFindings: findings.filter((f) => f.status === 'closed').length,
          })
        }

        setAudits(summaries)
      } catch (error) {
        console.error('Failed to load audit summaries:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const downloadSummary = () => {
    const headers = [
      'Audit ID',
      'Audit Type',
      'Status',
      'Total Findings',
      'Open Findings',
      'Closed Findings',
      'Report Number',
      'Generated Date',
    ]
    const rows = audits.map((audit) => [
      audit.plan.auditNumber,
      audit.plan.auditType,
      audit.plan.status,
      audit.findingCount,
      audit.openFindings,
      audit.closedFindings,
      audit.report?.reportNumber || '—',
      audit.report?.generatedAt
        ? new Date(audit.report.generatedAt).toLocaleDateString()
        : '—',
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iqa-summary-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-md text-on-surface">IQA Summary</h2>
            <p className="text-on-surface-variant/70 mt-1">
              Audit summary with findings overview
            </p>
          </div>
          <button
            onClick={downloadSummary}
            className="px-4 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Download
          </button>
        </div>
      </section>

      {/* Summary Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">Total Audits</p>
          <p className="font-display-lg mt-1 text-on-surface">{audits.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">
            Total Findings
          </p>
          <p className="font-display-lg mt-1 text-on-surface">
            {audits.reduce((sum, a) => sum + a.findingCount, 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">Open Findings</p>
          <p className="font-display-lg mt-1 text-error">
            {audits.reduce((sum, a) => sum + a.openFindings, 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">
            Closed Findings
          </p>
          <p className="font-display-lg mt-1 text-secondary">
            {audits.reduce((sum, a) => sum + a.closedFindings, 0)}
          </p>
        </div>
      </section>

      {/* Horizontal Audit Summary Cards */}
      <section className="space-y-4">
        {audits.map((audit) => (
          <div
            key={audit.plan.id}
            className="bg-white rounded-xl border border-outline-variant/20 shadow-soft overflow-hidden"
          >
            {/* Header - Always Visible */}
            <button
              onClick={() =>
                setExpandedAudit(
                  expandedAudit === audit.plan.id ? null : audit.plan.id
                )
              }
              className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors text-left"
            >
              <div className="flex-1">
                <h3 className="font-headline-sm text-on-surface">
                  {audit.plan.auditNumber}
                </h3>
                <p className="text-sm text-on-surface-variant/70 mt-1">
                  {audit.plan.auditType} Audit
                </p>
              </div>

              {/* Summary Stats */}
              <div className="flex gap-8 items-center mr-4">
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Total
                  </p>
                  <p className="font-display-md text-on-surface">
                    {audit.findingCount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Open
                  </p>
                  <p className="font-display-md text-error">
                    {audit.openFindings}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Closed
                  </p>
                  <p className="font-display-md text-secondary">
                    {audit.closedFindings}
                  </p>
                </div>
              </div>

              {/* Expand Icon */}
              <span
                className={`material-symbols-outlined transition-transform ${
                  expandedAudit === audit.plan.id ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Expanded Details */}
            {expandedAudit === audit.plan.id && (
              <div className="border-t border-outline-variant/20 p-6 bg-surface-container-lowest space-y-6">
                {/* Audit Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-on-surface-variant/60 uppercase">
                      Status
                    </p>
                    <p className="font-body-md text-on-surface mt-1">
                      {audit.plan.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant/60 uppercase">
                      Created
                    </p>
                    <p className="font-body-md text-on-surface mt-1">
                      {new Date(audit.plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {audit.report && (
                    <>
                      <div>
                        <p className="text-xs text-on-surface-variant/60 uppercase">
                          Report
                        </p>
                        <p className="font-body-md text-on-surface mt-1">
                          {audit.report.reportNumber || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant/60 uppercase">
                          Generated
                        </p>
                        <p className="font-body-md text-on-surface mt-1">
                          {audit.report.generatedAt
                            ? new Date(
                                audit.report.generatedAt
                              ).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Findings Table */}
                {audit.findings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/20">
                          <th className="py-2 px-4 font-label-md text-on-surface-variant uppercase">
                            Classification
                          </th>
                          <th className="py-2 px-4 font-label-md text-on-surface-variant uppercase">
                            Description
                          </th>
                          <th className="py-2 px-4 font-label-md text-on-surface-variant uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {audit.findings.map((finding) => (
                          <tr key={finding.id}>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                {finding.classification === 'Non-Conformance'
                                  ? 'NC'
                                  : 'OI'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-on-surface">
                              {finding.description}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  finding.status === 'open'
                                    ? 'bg-error/10 text-error'
                                    : 'bg-secondary/10 text-secondary'
                                }`}
                              >
                                {finding.status === 'open'
                                  ? 'Open'
                                  : 'Closed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-on-surface-variant/70">
                      No findings for this audit
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
