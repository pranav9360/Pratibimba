'use client'

import { useState } from 'react'
import Link from 'next/link'

type TabType = 'dashboard' | 'audit-plan' | 'scheduled' | 'create-report' | 'reports' | 'iqa-summary'

const generateIQANumber = () => {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `IQA${year}${random}`
}

const generateIQRNumber = () => {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `IQR${year}${random}`
}

interface AuditPlan {
  id: string
  auditNumber: string
  prakalpa: string
  auditor: string
  auditType: string
  startDate: string
  endDate: string
  status: 'planned' | 'scheduled' | 'completed'
  purpose?: string
}

interface AuditReport {
  id: string
  reportNumber: string
  auditId: string
  status: 'draft' | 'open' | 'closed'
  createdDate: string
  findings: Finding[]
}

interface Finding {
  id: string
  classification: 'non-conformance' | 'opportunity'
  description: string
  severity: 'high' | 'medium' | 'low'
  status: 'open' | 'closed'
}

interface ScheduledAudit extends AuditPlan {
  scheduledStartDate?: string
  scheduledEndDate?: string
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([
    {
      id: '1',
      auditNumber: 'IQA202400001',
      prakalpa: 'Main Office',
      auditor: 'John Smith',
      auditType: 'System',
      startDate: '2026-06-15',
      endDate: '2026-06-20',
      status: 'planned',
      purpose: 'Annual system audit',
    },
  ])
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([])
  const [reports, setReports] = useState<AuditReport[]>([])
  const [auditFormData, setAuditFormData] = useState({
    prakalpa: '',
    auditor: '',
    auditType: '',
    startDate: '',
    endDate: '',
    purpose: '',
  })
  const [scheduleFormData, setScheduleFormData] = useState({
    auditId: '',
    scheduledStartDate: '',
    scheduledEndDate: '',
  })
  const [reportFormData, setReportFormData] = useState<any>({
    auditId: '',
    findings: [{ classification: 'non-conformance', description: '', severity: 'high' }],
  })
  const [selectedAudit, setSelectedAudit] = useState<AuditPlan | null>(null)

  const handleCreateAuditPlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!auditFormData.prakalpa || !auditFormData.auditor) {
      alert('Please fill in all required fields')
      return
    }

    const newPlan: AuditPlan = {
      id: Math.random().toString(),
      auditNumber: generateIQANumber(),
      prakalpa: auditFormData.prakalpa,
      auditor: auditFormData.auditor,
      auditType: auditFormData.auditType,
      startDate: auditFormData.startDate,
      endDate: auditFormData.endDate,
      status: 'planned',
      purpose: auditFormData.purpose,
    }

    setAuditPlans([newPlan, ...auditPlans])
    setAuditFormData({
      prakalpa: '',
      auditor: '',
      auditType: '',
      startDate: '',
      endDate: '',
      purpose: '',
    })
    alert(`Audit Plan Created: ${newPlan.auditNumber}`)
  }

  const handleScheduleAudit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleFormData.auditId || !scheduleFormData.scheduledStartDate) {
      alert('Please select an audit and dates')
      return
    }

    const auditToSchedule = auditPlans.find((a) => a.id === scheduleFormData.auditId)
    if (!auditToSchedule) return

    const scheduledAudit: ScheduledAudit = {
      ...auditToSchedule,
      status: 'scheduled',
      scheduledStartDate: scheduleFormData.scheduledStartDate,
      scheduledEndDate: scheduleFormData.scheduledEndDate,
    }

    setScheduledAudits([scheduledAudit, ...scheduledAudits])
    setAuditPlans(auditPlans.filter((a) => a.id !== scheduleFormData.auditId))
    setScheduleFormData({
      auditId: '',
      scheduledStartDate: '',
      scheduledEndDate: '',
    })
    alert('Audit scheduled successfully')
  }

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportFormData.auditId) {
      alert('Please select an audit')
      return
    }

    const newReport: AuditReport = {
      id: Math.random().toString(),
      reportNumber: generateIQRNumber(),
      auditId: reportFormData.auditId,
      status: 'open',
      createdDate: new Date().toISOString().split('T')[0],
      findings: reportFormData.findings
        .filter((f: any) => f.description)
        .map((f: any) => ({
          id: Math.random().toString(),
          ...f,
          status: 'open',
        })),
    }

    setReports([newReport, ...reports])
    setReportFormData({
      auditId: '',
      findings: [{ classification: 'non-conformance', description: '', severity: 'high' }],
    })
    alert(`Report Created: ${newReport.reportNumber}`)
  }

  const handleDownloadReports = (format: 'csv' | 'excel') => {
    let content = ''
    if (format === 'csv') {
      content = 'Report Number,Audit ID,Status,Created Date\n'
      reports.forEach((r) => {
        content += `${r.reportNumber},${r.auditId},${r.status},${r.createdDate}\n`
      })
      const blob = new Blob([content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-reports-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } else {
      alert('Excel export requires a library. CSV exported instead.')
      const blob = new Blob([content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-reports-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
    }
  }

  const getPrakalpaOptions = () => {
    const prakalpas = new Set([
      ...auditPlans.map((a: AuditPlan) => a.prakalpa),
      ...scheduledAudits.map((a: ScheduledAudit) => a.prakalpa),
    ])
    return Array.from(prakalpas)
  }

  const getAuditorOptions = () => {
    const auditors = new Set([
      ...auditPlans.map((a: AuditPlan) => a.auditor),
      ...scheduledAudits.map((a: ScheduledAudit) => a.auditor),
    ])
    return Array.from(auditors)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface mb-2">Audit Management System</h1>
          <p className="text-on-surface-variant">Comprehensive audit planning, scheduling, and reporting</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-outline-variant">
          {(
            [
              { id: 'dashboard' as const, label: 'Dashboard' },
              { id: 'audit-plan' as const, label: 'Audit Plan' },
              { id: 'scheduled' as const, label: 'Scheduled Audits' },
              { id: 'create-report' as const, label: 'Create Report' },
              { id: 'reports' as const, label: 'All Reports' },
              { id: 'iqa-summary' as const, label: 'IQA Summary' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 border border-outline-variant">
                <h3 className="text-on-surface-variant text-sm font-medium">Total Audits</h3>
                <p className="text-3xl font-bold text-primary mt-2">{auditPlans.length + scheduledAudits.length}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-outline-variant">
                <h3 className="text-on-surface-variant text-sm font-medium">Planned</h3>
                <p className="text-3xl font-bold text-warning mt-2">{auditPlans.length}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-outline-variant">
                <h3 className="text-on-surface-variant text-sm font-medium">Scheduled</h3>
                <p className="text-3xl font-bold text-info mt-2">{scheduledAudits.length}</p>
              </div>
              <div className="bg-white rounded-lg p-6 border border-outline-variant">
                <h3 className="text-on-surface-variant text-sm font-medium">Reports</h3>
                <p className="text-3xl font-bold text-success mt-2">{reports.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Plan Tab */}
        {activeTab === 'audit-plan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-4">Create New Audit Plan</h2>
              <form onSubmit={handleCreateAuditPlan} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prakalpa (Location)"
                    value={auditFormData.prakalpa}
                    onChange={(e) => setAuditFormData({ ...auditFormData, prakalpa: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Auditor Name"
                    value={auditFormData.auditor}
                    onChange={(e) => setAuditFormData({ ...auditFormData, auditor: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  />
                  <select
                    value={auditFormData.auditType}
                    onChange={(e) => setAuditFormData({ ...auditFormData, auditType: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  >
                    <option value="">Select Audit Type</option>
                    <option value="system">System</option>
                    <option value="compliance">Compliance</option>
                    <option value="financial">Financial</option>
                  </select>
                  <input
                    type="date"
                    value={auditFormData.startDate}
                    onChange={(e) => setAuditFormData({ ...auditFormData, startDate: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  />
                  <input
                    type="date"
                    value={auditFormData.endDate}
                    onChange={(e) => setAuditFormData({ ...auditFormData, endDate: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Purpose/Description"
                    value={auditFormData.purpose}
                    onChange={(e) => setAuditFormData({ ...auditFormData, purpose: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90"
                >
                  Create Audit Plan
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-4">Audit Plans</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">IQA Number</th>
                      <th className="px-4 py-2 text-left font-semibold">Location</th>
                      <th className="px-4 py-2 text-left font-semibold">Auditor</th>
                      <th className="px-4 py-2 text-left font-semibold">Type</th>
                      <th className="px-4 py-2 text-left font-semibold">Dates</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditPlans.map((plan: AuditPlan) => (
                      <tr key={plan.id} className="border-t border-outline-variant hover:bg-surface/50">
                        <td className="px-4 py-3 font-mono text-primary">{plan.auditNumber}</td>
                        <td className="px-4 py-3">{plan.prakalpa}</td>
                        <td className="px-4 py-3">{plan.auditor}</td>
                        <td className="px-4 py-3">{plan.auditType}</td>
                        <td className="px-4 py-3 text-xs">
                          {plan.startDate} to {plan.endDate}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-medium rounded">
                            {plan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Scheduled Audits Tab */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-4">Schedule Audit</h2>
              <form onSubmit={handleScheduleAudit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={scheduleFormData.auditId}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, auditId: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                  >
                    <option value="">Select Audit to Schedule</option>
                    {auditPlans.map((plan: AuditPlan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.auditNumber} - {plan.prakalpa}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={scheduleFormData.scheduledStartDate}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledStartDate: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={scheduleFormData.scheduledEndDate}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduledEndDate: e.target.value })}
                    className="px-4 py-2 border border-outline rounded-lg"
                    placeholder="End Date"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-info text-white rounded-lg font-medium hover:opacity-90"
                >
                  Schedule Audit
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledAudits.map((audit: ScheduledAudit) => (
                <div key={audit.id} className="bg-white rounded-lg p-6 border border-info/30 border-l-4 border-l-info">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-on-surface-variant font-medium">IQA Number</p>
                      <p className="font-mono font-bold text-info">{audit.auditNumber}</p>
                    </div>
                    <span className="px-3 py-1 bg-info/20 text-info text-xs font-medium rounded-full">Scheduled</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Location:</span> {audit.prakalpa}
                    </p>
                    <p>
                      <span className="font-medium">Auditor:</span> {audit.auditor}
                    </p>
                    <p>
                      <span className="font-medium">Scheduled:</span> {audit.scheduledStartDate} to {audit.scheduledEndDate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Report Tab */}
        {activeTab === 'create-report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-4">Create Audit Report</h2>
              <form onSubmit={handleCreateReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Audit</label>
                  <select
                    value={reportFormData.auditId}
                    onChange={(e) => setReportFormData({ ...reportFormData, auditId: e.target.value })}
                    className="w-full px-4 py-2 border border-outline rounded-lg"
                  >
                    <option value="">Select an audit to report on</option>
                    {[...auditPlans, ...scheduledAudits].map((audit: AuditPlan | ScheduledAudit) => (
                      <option key={audit.id} value={audit.id}>
                        {audit.auditNumber} - {audit.prakalpa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Findings</label>
                  {reportFormData.findings.map((finding: any, idx: number) => (
                    <div key={idx} className="space-y-2 mb-4 p-4 bg-surface rounded-lg">
                      <select
                        value={finding.classification}
                        onChange={(e) => {
                          const newFindings = [...reportFormData.findings]
                          newFindings[idx].classification = e.target.value
                          setReportFormData({ ...reportFormData, findings: newFindings })
                        }}
                        className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
                      >
                        <option value="non-conformance">Non-Conformance</option>
                        <option value="opportunity">Opportunity for Improvement</option>
                      </select>
                      <textarea
                        placeholder="Finding description"
                        value={finding.description}
                        onChange={(e) => {
                          const newFindings = [...reportFormData.findings]
                          newFindings[idx].description = e.target.value
                          setReportFormData({ ...reportFormData, findings: newFindings })
                        }}
                        className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
                        rows={2}
                      />
                      <select
                        value={finding.severity}
                        onChange={(e) => {
                          const newFindings = [...reportFormData.findings]
                          newFindings[idx].severity = e.target.value
                          setReportFormData({ ...reportFormData, findings: newFindings })
                        }}
                        className="w-full px-3 py-2 border border-outline rounded-lg text-sm"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:opacity-90"
                >
                  Create Report
                </button>
              </form>
            </div>
          </div>
        )}

        {/* All Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleDownloadReports('csv')}
                className="px-4 py-2 bg-outline text-on-surface rounded-lg font-medium hover:opacity-90"
              >
                Download CSV
              </button>
              <button
                onClick={() => handleDownloadReports('excel')}
                className="px-4 py-2 bg-outline text-on-surface rounded-lg font-medium hover:opacity-90"
              >
                Download Excel
              </button>
            </div>

            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-4">All Reports</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Report Number</th>
                      <th className="px-4 py-2 text-left font-semibold">Audit</th>
                      <th className="px-4 py-2 text-left font-semibold">Created</th>
                      <th className="px-4 py-2 text-left font-semibold">Findings</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report: AuditReport) => (
                      <tr key={report.id} className="border-t border-outline-variant hover:bg-surface/50">
                        <td className="px-4 py-3 font-mono text-primary">{report.reportNumber}</td>
                        <td className="px-4 py-3">{report.auditId}</td>
                        <td className="px-4 py-3 text-xs">{report.createdDate}</td>
                        <td className="px-4 py-3">{report.findings.length}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              report.status === 'closed'
                                ? 'bg-success/20 text-success'
                                : 'bg-warning/20 text-warning'
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant">No reports created yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* IQA Summary Tab */}
        {activeTab === 'iqa-summary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-outline-variant">
              <h2 className="text-xl font-bold mb-6">Audit Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...auditPlans, ...scheduledAudits].map((audit: AuditPlan | ScheduledAudit) => {
                  const auditReports = reports.filter((r: AuditReport) => r.auditId === audit.id)
                  const totalFindings = auditReports.reduce((sum: number, r: AuditReport) => sum + r.findings.length, 0)
                  return (
                    <div
                      key={audit.id}
                      className="bg-gradient-to-br from-surface to-surface-dim rounded-lg p-4 border border-outline-variant hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="mb-3">
                        <p className="text-xs text-on-surface-variant font-medium">Audit ID</p>
                        <p className="font-mono font-bold text-primary">{audit.auditNumber}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-on-surface-variant">Location</p>
                          <p className="font-medium">{audit.prakalpa}</p>
                        </div>
                        <div>
                          <p className="text-on-surface-variant">Type</p>
                          <p className="font-medium">{audit.auditType}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-outline-variant">
                        <p className="text-xs text-on-surface-variant mb-1">Reports & Findings</p>
                        <p className="text-sm font-semibold text-primary">
                          {auditReports.length} Report{auditReports.length !== 1 ? 's' : ''} • {totalFindings} Finding
                          {totalFindings !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
