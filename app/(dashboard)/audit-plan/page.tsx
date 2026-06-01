'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getAuditPlans, getPrakalpas, getAuditors, scheduleAudit } from '@/app/actions/audits'
import { StatusPill } from '@/components/status-pill'

interface AuditPlan {
  id: number
  auditNumber: string
  prakalpaaId: number
  auditorId: number
  auditType: string
  tentativeStartDate?: string | null
  tentativeEndDate?: string | null
  scheduled_start_date?: string | null
  scheduled_end_date?: string | null
  status: string
  description?: string | null
  createdAt: Date
}

interface Prakalpa {
  id: number
  name: string
  location?: string | null
}

interface Auditor {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  department?: string | null
  isActive?: boolean
}

export default function AuditPlanPage() {
  const [audits, setAudits] = useState<AuditPlan[]>([])
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([])
  const [auditors, setAuditors] = useState<Auditor[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    prakalpa: '',
    auditor: '',
    type: '',
    status: 'planned',
  })
  const [selectedAudit, setSelectedAudit] = useState<AuditPlan | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleData, setScheduleData] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [auditData, prakalpasData, auditorsData] = await Promise.all([
          getAuditPlans(),
          getPrakalpas(),
          getAuditors(),
        ])
        setAudits(auditData)
        setPrakalpas(prakalpasData)
        setAuditors(auditorsData)
      } catch (error) {
        console.error('Failed to load audit plans:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredAudits = audits.filter((audit) => {
    if (filters.prakalpa && audit.prakalpaaId !== parseInt(filters.prakalpa))
      return false
    if (filters.auditor && audit.auditorId !== parseInt(filters.auditor))
      return false
    if (filters.type && audit.auditType !== filters.type) return false
    if (filters.status && audit.status !== filters.status) return false
    return true
  })

  const handleSchedule = async () => {
    if (!selectedAudit || !scheduleData.startDate || !scheduleData.endDate) return

    try {
      await scheduleAudit(selectedAudit.id, {
        scheduledStartDate: scheduleData.startDate,
        scheduledEndDate: scheduleData.endDate,
      })
      setShowScheduleModal(false)
      setSelectedAudit(null)
      setScheduleData({ startDate: '', endDate: '' })
      // Reload audits
      const updated = await getAuditPlans()
      setAudits(updated)
    } catch (error) {
      console.error('Failed to schedule audit:', error)
    }
  }

  const getPrakalpasName = (id: number) => {
    return prakalpas.find((p) => p.id === id)?.name || 'Unknown'
  }

  const getAuditorName = (id: number) => {
    return auditors.find((a) => a.id === id)?.name || 'Unknown'
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <section>
        <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
        <p className="text-on-surface-variant/70 mt-1">
          All planned audits with tentative dates and assigned auditors
        </p>
      </section>

      {/* Filters Card */}
      <section className="bg-white rounded-xl p-6 border border-outline-variant/20 shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Prakalpa
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all"
                value={filters.prakalpa}
                onChange={(e) =>
                  setFilters({ ...filters, prakalpa: e.target.value })
                }
              >
                <option value="">All Prakalpas</option>
                {prakalpas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Auditor
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all"
                value={filters.auditor}
                onChange={(e) =>
                  setFilters({ ...filters, auditor: e.target.value })
                }
              >
                <option value="">All Auditors</option>
                {auditors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-label-md text-on-surface-variant/80 block">
                Audit Type
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-lowest font-body-md py-2 px-3 focus:ring-primary/20 focus:border-primary transition-all"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="">All Types</option>
                <option value="Compliance">Compliance</option>
                <option value="Financial">Financial</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
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
                <option value="planned">Planned</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Audits Table */}
      <div className="bg-white border border-outline-variant/20 shadow-soft rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 border-b border-outline-variant">
              <tr className="bg-zebra">
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Audit ID
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Prakalpa
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Auditor
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Tentative Dates
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredAudits.map((audit, idx) => (
                <tr
                  key={audit.id}
                  className={`hover:bg-surface-container-low transition-colors ${
                    idx % 2 === 1 ? 'bg-zebra' : ''
                  }`}
                >
                  <td className="font-data-mono font-bold text-primary px-4 py-4">
                    {audit.auditNumber}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {getPrakalpasName(audit.prakalpaaId)}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {audit.auditType}
                  </td>
                  <td className="font-body-md text-on-surface px-4 py-4">
                    {getAuditorName(audit.auditorId)}
                  </td>
                  <td className="font-body-md text-on-surface-variant px-4 py-4">
                    {audit.tentativeStartDate && audit.tentativeEndDate ? (
                      <span className="text-sm">
                        {new Date(audit.tentativeStartDate).toLocaleDateString()} -{' '}
                        {new Date(audit.tentativeEndDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusPill status={audit.status as 'pending' | 'verified' | 'failed' | 'escalated' | 'in-review'} />
                  </td>
                  <td className="px-4 py-4">
                    {audit.status === 'planned' && (
                      <button
                        onClick={() => {
                          setSelectedAudit(audit)
                          setShowScheduleModal(true)
                        }}
                        className="px-3 py-1.5 bg-primary text-on-primary rounded text-sm font-label-md hover:bg-primary/90 transition-colors"
                      >
                        Schedule
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && selectedAudit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-headline-sm mb-4">
              Schedule Audit: {selectedAudit.auditNumber}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="font-label-md text-on-surface-variant/80 block mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={scheduleData.startDate}
                  onChange={(e) =>
                    setScheduleData({
                      ...scheduleData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="font-label-md text-on-surface-variant/80 block mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={scheduleData.endDate}
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, endDate: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedule}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
