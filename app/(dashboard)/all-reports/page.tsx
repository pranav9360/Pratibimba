'use client'

import { useState, useEffect } from 'react'
import {
  getAuditReports,
  getAuditPlans,
  getFindingsByReport,
} from '@/app/actions/audits'

interface AuditReport {
  id: number
  auditPlanId: number
  reportNumber?: string | null
  status: string
  generatedAt?: Date | null
  findingsSummary?: string | null
  createdAt: Date
  updatedAt: Date
}

interface AuditPlan {
  id: number
  auditNumber: string
}

interface Finding {
  id: number
  classification: string
  status: string
  description: string
}

export default function AllReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>([])
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([])
  const [reportFindings, setReportFindings] = useState<
    Record<number, Finding[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    dateRange: 'all',
  })
  const [selectedReports, setSelectedReports] = useState<number[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportsData, plansData] = await Promise.all([
          getAuditReports(),
          getAuditPlans(),
        ])
        setReports(reportsData)
        setAuditPlans(plansData)

        // Load findings for each report
        const findings: Record<number, Finding[]> = {}
        for (const report of reportsData) {
          try {
            findings[report.id] = await getFindingsByReport(report.id)
          } catch (error) {
            findings[report.id] = []
          }
        }
        setReportFindings(findings)
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getAuditNumber = (planId: number) => {
    return auditPlans.find((p) => p.id === planId)?.auditNumber || 'Unknown'
  }

  const getDaysOpen = (createdAt: Date) => {
    const created = new Date(createdAt)
    const today = new Date()
    const daysOpen = Math.floor(
      (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysOpen
  }

  const getReportStatus = (report: AuditReport) => {
    const findings = reportFindings[report.id] || []
    const openFindings = findings.filter((f) => f.status === 'open').length

    if (report.status === 'closed' || openFindings === 0) {
      return { label: 'Closed', color: 'green' }
    }

    const daysOpen = getDaysOpen(report.createdAt)
    if (daysOpen > 30) {
      return { label: 'Overdue', color: 'red' }
    }

    return { label: 'Open', color: 'yellow' }
  }

  const getNCCount = (reportId: number) => {
    return (reportFindings[reportId] || []).filter(
      (f) => f.classification === 'Non-Conformance'
    ).length
  }

  const getOICount = (reportId: number) => {
    return (reportFindings[reportId] || []).filter(
      (f) => f.classification === 'Opportunity for Improvement'
    ).length
  }

  const filteredReports = reports.filter((report) => {
    if (filters.status && report.status !== filters.status) return false

    if (filters.dateRange !== 'all') {
      const created = new Date(report.createdAt)
      const today = new Date()
      const daysAgo = parseInt(filters.dateRange)

      const cutoffDate = new Date(today)
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

      if (created < cutoffDate) return false
    }

    return true
  })

  const downloadAsCSV = () => {
    const headers = [
      'Report Number',
      'Audit ID',
      'Status',
      'Days Open',
      'Non-Conformances',
      'Opportunities',
      'Generated Date',
    ]
    const rows = filteredReports.map((report) => [
      report.reportNumber || '—',
      getAuditNumber(report.auditPlanId),
      getReportStatus(report).label,
      getDaysOpen(report.createdAt),
      getNCCount(report.id),
      getOICount(report.id),
      report.generatedAt
        ? new Date(report.generatedAt).toLocaleDateString()
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
    a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const downloadAsExcel = () => {
    const headers = [
      'Report Number',
      'Audit ID',
      'Status',
      'Days Open',
      'Non-Conformances',
      'Opportunities',
      'Generated Date',
    ]
    const rows = filteredReports.map((report) => [
      report.reportNumber || '—',
      getAuditNumber(report.auditPlanId),
      getReportStatus(report).label,
      getDaysOpen(report.createdAt),
      getNCCount(report.id),
      getOICount(report.id),
      report.generatedAt
        ? new Date(report.generatedAt).toLocaleDateString()
        : '—',
    ])

    // Simple Excel-like format
    let excel = headers.join('\t') + '\n'
    rows.forEach((row) => {
      excel += row.join('\t') + '\n'
    })

    const blob = new Blob([excel], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <section>
        <h2 className="font-headline-md text-on-surface">All Reports</h2>
        <p className="text-on-surface-variant/70 mt-1">
          Complete audit reports with findings, timelines, and closure status
        </p>
      </section>

      {/* Filters and Downloads */}
      <section className="bg-white rounded-xl p-6 border border-outline-variant/20 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Status
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Date Range
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all"
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
              >
                <option value="all">All Time</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={downloadAsCSV}
              className="px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-label-md hover:bg-secondary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              CSV
            </button>
            <button
              onClick={downloadAsExcel}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              Excel
            </button>
          </div>
        </div>
      </section>

      {/* Reports Table */}
      <div className="bg-white border border-outline-variant/20 shadow-soft rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-outline-variant">
              <tr className="bg-zebra">
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Report Number
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Audit ID
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Days Open
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Non-Conformances
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Opportunities
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Generated Date
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Report Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredReports.map((report, idx) => {
                const status = getReportStatus(report)
                const statusColor =
                  status.color === 'green'
                    ? 'bg-green-100 text-green-800'
                    : status.color === 'red'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'

                return (
                  <tr
                    key={report.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      idx % 2 === 1 ? 'bg-zebra' : ''
                    }`}
                  >
                    <td className="font-data-mono font-bold text-primary px-4 py-4">
                      {report.reportNumber || '—'}
                    </td>
                    <td className="font-body-md text-on-surface px-4 py-4">
                      {getAuditNumber(report.auditPlanId)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="font-body-md text-on-surface px-4 py-4">
                      {getDaysOpen(report.createdAt)}
                    </td>
                    <td className="font-body-md text-on-surface px-4 py-4">
                      {getNCCount(report.id)}
                    </td>
                    <td className="font-body-md text-on-surface px-4 py-4">
                      {getOICount(report.id)}
                    </td>
                    <td className="font-body-md text-on-surface-variant px-4 py-4">
                      {report.generatedAt
                        ? new Date(report.generatedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="font-body-md text-on-surface-variant px-4 py-4">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
