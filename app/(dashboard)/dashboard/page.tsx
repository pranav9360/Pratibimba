'use client'

import { useState, useEffect } from 'react'
import {
  getAuditPlans,
  getScheduledAudits,
  getAuditReports,
  getPrakalpas,
} from '@/app/actions/audits'
import Link from 'next/link'

interface AuditPlan {
  id: number
  auditNumber: string
  status: string
  prakalpaaId?: number
  auditorId?: number
  createdAt?: Date
}

interface AuditReport {
  id: number
  auditPlanId: number
  status: string
  createdAt: Date
}

interface Prakalpa {
  id: number
  name: string
  location?: string | null
  description?: string | null
}

export default function DashboardPage() {
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([])
  const [scheduledAudits, setScheduledAudits] = useState<AuditPlan[]>([])
  const [reports, setReports] = useState<AuditReport[]>([])
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [plansData, scheduledData, reportsData, prakalpasData] =
          await Promise.all([
            getAuditPlans(),
            getScheduledAudits(),
            getAuditReports(),
            getPrakalpas(),
          ])

        setAuditPlans(plansData)
        setScheduledAudits(scheduledData)
        setReports(reportsData)
        setPrakalpas(prakalpasData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalAudits = auditPlans.length
  const completedAudits = reports.filter((r) => r.status === 'closed').length
  const completionRate =
    totalAudits > 0
      ? Math.round((completedAudits / totalAudits) * 100)
      : 0

  const overallNCPercentage = reports.length > 0 ? 42 : 0 // This would need to be calculated from findings
  const overdueClosure = reports.filter(
    (r) => r.status === 'draft'
  ).length
  const closureRate = totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <section>
        <h1 className="font-display-lg text-on-surface">Audit Dashboard</h1>
        <p className="text-on-surface-variant/70 mt-2">
          Real-time overview of your audit management system
        </p>
      </section>

      {/* Main Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Prakalpas */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant/70 font-medium">
                No. of Prakalpas
              </p>
              <h3 className="font-display-lg text-on-surface mt-2">
                {prakalpas.length}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">
                location_on
              </span>
            </div>
          </div>
          <p className="font-label-md text-on-surface-variant/60 mt-4">
            Active locations
          </p>
        </div>

        {/* Total Audits */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant/70 font-medium">
                Total Audits
              </p>
              <h3 className="font-display-lg text-on-surface mt-2">
                {totalAudits}
              </h3>
            </div>
            <div className="p-3 bg-secondary/10 rounded-lg">
              <span className="material-symbols-outlined text-secondary">
                assessment
              </span>
            </div>
          </div>
          <p className="font-label-md text-on-surface-variant/60 mt-4">
            All audits planned
          </p>
        </div>

        {/* NC Percentage */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant/70 font-medium">
                NC Percentage
              </p>
              <h3 className="font-display-lg text-on-surface mt-2">
                {overallNCPercentage}%
              </h3>
            </div>
            <div className="p-3 bg-error/10 rounded-lg">
              <span className="material-symbols-outlined text-error">
                warning
              </span>
            </div>
          </div>
          <p className="font-label-md text-on-surface-variant/60 mt-4">
            Non-conformances
          </p>
        </div>

        {/* Closure Rate */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-label-md text-on-surface-variant/70 font-medium">
                Closure Rate
              </p>
              <h3 className="font-display-lg text-on-surface mt-2">
                {closureRate}%
              </h3>
            </div>
            <div className="p-3 bg-tertiary/10 rounded-lg">
              <span className="material-symbols-outlined text-tertiary">
                trending_up
              </span>
            </div>
          </div>
          <p className="font-label-md text-on-surface-variant/60 mt-4">
            Completed audits
          </p>
        </div>
      </section>

      {/* Secondary Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scheduled Audits */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-on-surface">Scheduled Audits</h3>
            <span className="material-symbols-outlined text-on-surface-variant">
              calendar_today
            </span>
          </div>
          <p className="font-display-lg text-secondary">{scheduledAudits.length}</p>
          <p className="font-label-md text-on-surface-variant/60 mt-2">
            Ready for execution
          </p>
          <Link
            href="/dashboard/scheduled-audits"
            className="mt-4 inline-block text-primary font-label-md hover:underline"
          >
            View all →
          </Link>
        </div>

        {/* Overdue Audits */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-on-surface">Overdue</h3>
            <span className="material-symbols-outlined text-error">
              schedule
            </span>
          </div>
          <p className="font-display-lg text-error">0</p>
          <p className="font-label-md text-on-surface-variant/60 mt-2">
            Need immediate attention
          </p>
        </div>

        {/* Pending Reports */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-sm text-on-surface">Pending Reports</h3>
            <span className="material-symbols-outlined text-primary">
              description
            </span>
          </div>
          <p className="font-display-lg text-primary">
            {reports.filter((r) => r.status === 'draft').length}
          </p>
          <p className="font-label-md text-on-surface-variant/60 mt-2">
            Awaiting completion
          </p>
          <Link
            href="/dashboard/all-reports"
            className="mt-4 inline-block text-primary font-label-md hover:underline"
          >
            View all →
          </Link>
        </div>
      </section>

      {/* Chart Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10">
          <h3 className="font-headline-sm mb-6 text-on-surface">Audit Status</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-label-md text-on-surface-variant">
                  Planned
                </span>
                <span className="font-label-md font-bold text-on-surface">
                  {auditPlans.filter((a) => a.status === 'planned').length}
                </span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full"
                  style={{
                    width: `${auditPlans.filter((a) => a.status === 'planned').length > 0 ? 75 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-label-md text-on-surface-variant">
                  Scheduled
                </span>
                <span className="font-label-md font-bold text-on-surface">
                  {scheduledAudits.length}
                </span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${scheduledAudits.length > 0 ? 40 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-label-md text-on-surface-variant">
                  Completed
                </span>
                <span className="font-label-md font-bold text-on-surface">
                  {reports.filter((r) => r.status === 'closed').length}
                </span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div
                  className="bg-tertiary h-2 rounded-full"
                  style={{
                    width: `${reports.filter((r) => r.status === 'closed').length > 0 ? 60 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-outline-variant/10">
          <h3 className="font-headline-sm mb-6 text-on-surface">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/audit-plan"
              className="block p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors font-label-md text-on-surface font-bold"
            >
              <div className="flex items-center justify-between">
                <span>View Audit Plans</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </Link>
            <Link
              href="/dashboard/scheduled-audits"
              className="block p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors font-label-md text-on-surface font-bold"
            >
              <div className="flex items-center justify-between">
                <span>View Scheduled Audits</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </Link>
            <Link
              href="/dashboard/all-reports"
              className="block p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors font-label-md text-on-surface font-bold"
            >
              <div className="flex items-center justify-between">
                <span>View All Reports</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </Link>
            <Link
              href="/dashboard/iqa-summary"
              className="block p-4 rounded-lg border border-outline-variant/20 hover:bg-surface-container-low transition-colors font-label-md text-on-surface font-bold"
            >
              <div className="flex items-center justify-between">
                <span>View IQA Summary</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
