'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getScheduledAudits,
  getPrakalpas,
  getAuditors,
  createAuditReport,
} from '@/app/actions/audits'
import { StatusPill } from '@/components/status-pill'

interface ScheduledAudit {
  id: number
  auditNumber: string
  prakalpaaId: number
  auditorId: number
  auditType: string
  scheduledStartDate?: string | null
  scheduledEndDate?: string | null
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

export default function ScheduledAuditsPage() {
  const [audits, setAudits] = useState<ScheduledAudit[]>([])
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([])
  const [auditors, setAuditors] = useState<Auditor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAudit, setSelectedAudit] = useState<ScheduledAudit | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportNumber, setReportNumber] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [auditData, prakalpasData, auditorsData] = await Promise.all([
          getScheduledAudits(),
          getPrakalpas(),
          getAuditors(),
        ])
        setAudits(auditData)
        setPrakalpas(prakalpasData)
        setAuditors(auditorsData)
      } catch (error) {
        console.error('Failed to load scheduled audits:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleWriteReport = async () => {
    if (!selectedAudit || !reportNumber) return

    try {
      await createAuditReport({
        auditPlanId: selectedAudit.id,
        reportNumber,
      })
      setShowReportModal(false)
      setSelectedAudit(null)
      setReportNumber('')
      // Reload audits
      const updated = await getScheduledAudits()
      setAudits(updated)
    } catch (error) {
      console.error('Failed to create report:', error)
    }
  }

  const getPrakalpasName = (id: number) => {
    return prakalpas.find((p) => p.id === id)?.name || 'Unknown'
  }

  const getAuditorName = (id: number) => {
    return auditors.find((a) => a.id === id)?.name || 'Unknown'
  }

  const getDaysRemaining = (startDate: string, endDate: string) => {
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (today < start) {
      const daysUntilStart = Math.ceil(
        (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      return `Starts in ${daysUntilStart} days`
    }

    if (today > end) {
      return 'Overdue'
    }

    const daysRemaining = Math.ceil(
      (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    return `${daysRemaining} days remaining`
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <section>
        <h2 className="font-headline-md text-on-surface">Scheduled Audits</h2>
        <p className="text-on-surface-variant/70 mt-1">
          Upcoming audits ready for execution with report generation
        </p>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">Total Scheduled</p>
          <p className="font-display-lg mt-1 text-on-surface">{audits.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">Upcoming</p>
          <p className="font-display-lg mt-1 text-secondary">
            {
              audits.filter((a) =>
                a.scheduledStartDate
                  ? new Date(a.scheduledStartDate) > new Date()
                  : false
              ).length
            }
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">In Progress</p>
          <p className="font-display-lg mt-1 text-primary">
            {
              audits.filter((a) => {
                const start = a.scheduledStartDate
                  ? new Date(a.scheduledStartDate)
                  : null
                const end = a.scheduledEndDate
                  ? new Date(a.scheduledEndDate)
                  : null
                const today = new Date()
                return start && end && today >= start && today <= end
              }).length
            }
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-outline-variant/20">
          <p className="font-label-md text-on-surface-variant">Overdue</p>
          <p className="font-display-lg mt-1 text-error">
            {
              audits.filter((a) =>
                a.scheduledEndDate
                  ? new Date(a.scheduledEndDate) < new Date()
                  : false
              ).length
            }
          </p>
        </div>
      </section>

      {/* Audits Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audits.map((audit) => {
          const isOverdue =
            audit.scheduledEndDate &&
            new Date(audit.scheduledEndDate) < new Date()
          const isInProgress =
            audit.scheduledStartDate &&
            audit.scheduledEndDate &&
            new Date(audit.scheduledStartDate) <= new Date() &&
            new Date(audit.scheduledEndDate) >= new Date()

          return (
            <div
              key={audit.id}
              className={`rounded-xl p-6 border-2 transition-all ${
                isOverdue
                  ? 'bg-error/5 border-error/20'
                  : isInProgress
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-white border-outline-variant/20'
              }`}
            >
              {/* Header with Status */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-headline-sm text-on-surface">
                    {audit.auditNumber}
                  </h3>
                  <p className="text-sm text-on-surface-variant/70 mt-1">
                    {getPrakalpasName(audit.prakalpaaId)}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isOverdue
                      ? 'bg-error/10 text-error'
                      : isInProgress
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  {isOverdue
                    ? 'Overdue'
                    : isInProgress
                      ? 'In Progress'
                      : 'Scheduled'}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4 pb-4 border-b border-outline-variant/20">
                <div>
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Auditor
                  </p>
                  <p className="font-body-md text-on-surface">
                    {getAuditorName(audit.auditorId)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Audit Type
                  </p>
                  <p className="font-body-md text-on-surface">
                    {audit.auditType}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Dates
                  </p>
                  <p className="font-body-md text-on-surface">
                    {audit.scheduledStartDate && audit.scheduledEndDate
                      ? `${new Date(audit.scheduledStartDate).toLocaleDateString()} - ${new Date(audit.scheduledEndDate).toLocaleDateString()}`
                      : '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant/60 uppercase">
                    Timeline
                  </p>
                  <p
                    className={`font-label-md font-bold ${
                      isOverdue ? 'text-error' : 'text-on-surface'
                    }`}
                  >
                    {audit.scheduledStartDate && audit.scheduledEndDate
                      ? getDaysRemaining(
                          audit.scheduledStartDate,
                          audit.scheduledEndDate
                        )
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  setSelectedAudit(audit)
                  setShowReportModal(true)
                }}
                className="w-full py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  description
                </span>
                Write Report
              </button>
            </div>
          )
        })}
      </section>

      {/* Report Modal */}
      {showReportModal && selectedAudit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-headline-sm mb-4">
              Create Report for {selectedAudit.auditNumber}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="font-label-md text-on-surface-variant/80 block mb-2">
                  Report Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., RPT-2024-001"
                  className="w-full rounded-lg border border-outline-variant/40 px-3 py-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWriteReport}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-colors"
                >
                  Create Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
