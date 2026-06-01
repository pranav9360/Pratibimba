'use client'

import { useState } from 'react'

type TabType = 'dashboard' | 'audit-plan' | 'scheduled' | 'create-report' | 'reports' | 'iqa-summary'

// Helper functions
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

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [auditPlans, setAuditPlans] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])

  const handleCreateAuditPlan = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    
    const newPlan = {
      id: Math.random(),
      auditNumber: generateIQANumber(),
      prakalpaa: formData.get('prakalpa'),
      auditor: formData.get('auditor'),
      type: formData.get('auditType'),
      dates: `${formData.get('startDate')} to ${formData.get('endDate')}`,
      status: 'planned',
      purpose: formData.get('purpose'),
    }
    
    setAuditPlans([newPlan, ...auditPlans])
    form.reset()
    alert(`Audit Plan Created: ${newPlan.auditNumber}`)
  }

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    
    const newReport = {
      id: Math.random(),
      iqrNumber: generateIQRNumber(),
      iqaNumber: generateIQANumber(),
      status: 'draft',
      daysOpen: 0,
      findings: `NC: 1, OI: 2`,
    }
    
    setReports([newReport, ...reports])
    form.reset()
    alert(`Report Created: ${newReport.iqrNumber}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-on-primary p-6">
        <h1 className="text-3xl font-bold">Pratibimba Audit Management System</h1>
        <p className="text-on-primary/80 mt-2">Complete audit lifecycle management</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-outline-variant/20 bg-surface sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'audit-plan', label: 'Audit Plan' },
              { id: 'scheduled', label: 'Scheduled Audits' },
              { id: 'create-report', label: 'Create Report' },
              { id: 'reports', label: 'All Reports' },
              { id: 'iqa-summary', label: 'IQA Summary' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-6 py-4 border-b-2 font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface/60 hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10">
                <div className="text-3xl font-bold text-primary">{auditPlans.length}</div>
                <div className="text-sm text-on-surface/60 mt-2">Total Audit Plans</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10">
                <div className="text-3xl font-bold text-tertiary">0</div>
                <div className="text-sm text-on-surface/60 mt-2">Scheduled Audits</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10">
                <div className="text-3xl font-bold text-secondary">{reports.length}</div>
                <div className="text-sm text-on-surface/60 mt-2">Total Reports</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10">
                <div className="text-3xl font-bold text-error">0</div>
                <div className="text-sm text-on-surface/60 mt-2">Open Reports</div>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT PLAN */}
        {activeTab === 'audit-plan' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Audit Plan</h2>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10 mb-8">
              <h3 className="font-bold mb-4">Create New Audit Plan</h3>
              <form onSubmit={handleCreateAuditPlan} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Prakalpa (Location)</label>
                    <input type="text" name="prakalpa" placeholder="Enter location" className="w-full border border-outline-variant rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Auditor Name</label>
                    <input type="text" name="auditor" placeholder="Enter auditor name" className="w-full border border-outline-variant rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Audit Type</label>
                    <input type="text" name="auditType" placeholder="e.g., Financial, Compliance" className="w-full border border-outline-variant rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Start Date</label>
                    <input type="date" name="startDate" className="w-full border border-outline-variant rounded px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">End Date</label>
                    <input type="date" name="endDate" className="w-full border border-outline-variant rounded px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Audit Purpose</label>
                  <textarea name="purpose" placeholder="Describe audit purpose" className="w-full border border-outline-variant rounded px-3 py-2" rows={3} />
                </div>
                <button type="submit" className="bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-primary/90">
                  Create Audit Plan
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-outline-variant/10">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-outline-variant/20">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">IQA Number</th>
                    <th className="px-6 py-3 text-left font-semibold">Location</th>
                    <th className="px-6 py-3 text-left font-semibold">Auditor</th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Dates</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {auditPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-surface/50">
                      <td className="px-6 py-4 font-mono">{plan.auditNumber}</td>
                      <td className="px-6 py-4">{plan.prakalpaa}</td>
                      <td className="px-6 py-4">{plan.auditor}</td>
                      <td className="px-6 py-4">{plan.type}</td>
                      <td className="px-6 py-4 text-xs">{plan.dates}</td>
                      <td className="px-6 py-4">
                        <span className="bg-warning/20 text-warning px-2 py-1 rounded text-xs font-medium">
                          {plan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditPlans.length === 0 && (
                <div className="p-6 text-center text-on-surface/60">
                  No audit plans created yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREATE REPORT */}
        {activeTab === 'create-report' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Create Audit Report</h2>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10">
              <form onSubmit={handleCreateReport} className="space-y-6">
                <div>
                  <label className="text-sm font-medium block mb-2">Select Audit</label>
                  <select className="w-full border border-outline-variant rounded px-3 py-2" required>
                    <option value="">Select an audit</option>
                    {auditPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.auditNumber} - {plan.prakalpaa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Visit Time</label>
                  <input type="datetime-local" className="w-full border border-outline-variant rounded px-3 py-2" />
                </div>

                <div>
                  <h4 className="font-bold mb-4">Findings</h4>
                  <div className="p-4 bg-surface rounded border border-outline-variant/20 mb-4">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">Classification</label>
                        <select className="w-full border border-outline-variant rounded px-3 py-2" required>
                          <option value="">Select</option>
                          <option value="open-for-improvement">Open for Improvement</option>
                          <option value="non-conformance">Non-Conformance</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">Severity</label>
                        <select className="w-full border border-outline-variant rounded px-3 py-2">
                          <option value="">Select</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-2">Description</label>
                      <textarea placeholder="Describe the finding" className="w-full border border-outline-variant rounded px-3 py-2" rows={3} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-primary/90"
                >
                  Create Report
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ALL REPORTS */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">All Reports</h2>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-outline-variant/10">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-outline-variant/20">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">IQR Number</th>
                    <th className="px-6 py-3 text-left font-semibold">IQA Number</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Days Open</th>
                    <th className="px-6 py-3 text-left font-semibold">Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-surface/50">
                      <td className="px-6 py-4 font-mono">{report.iqrNumber}</td>
                      <td className="px-6 py-4 font-mono">{report.iqaNumber}</td>
                      <td className="px-6 py-4">
                        <span className="bg-warning/20 text-warning px-2 py-1 rounded text-xs font-medium">
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{report.daysOpen} days</td>
                      <td className="px-6 py-4 text-xs">{report.findings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reports.length === 0 && (
                <div className="p-6 text-center text-on-surface/60">
                  No reports created yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* IQA SUMMARY */}
        {activeTab === 'iqa-summary' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">IQA Summary</h2>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="bg-surface rounded-lg p-8 text-center border border-outline-variant/20">
                  <p className="text-on-surface/60">No reports to display</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="bg-white rounded-lg p-6 shadow-sm border border-outline-variant/10 hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{report.iqaNumber}</h4>
                        <p className="text-sm text-on-surface/60">Report: {report.iqrNumber}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-error">1</div>
                          <p className="text-xs text-on-surface/60">Non-Conformances</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-warning">2</div>
                          <p className="text-xs text-on-surface/60">Improvements</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SCHEDULED AUDITS */}
        {activeTab === 'scheduled' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Scheduled Audits</h2>
            <div className="bg-surface rounded-lg p-8 text-center border border-outline-variant/20">
              <p className="text-on-surface/60">Schedule an audit from the "Audit Plan" tab to see it here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
