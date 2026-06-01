"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  BarChart3
} from "lucide-react"

const complianceReports = [
  {
    id: "CMP-001",
    title: "GST Compliance Report Q4 2024",
    category: "GST",
    status: "compliant",
    score: 98,
    date: "Dec 20, 2024",
    findings: 2,
    criticalFindings: 0
  },
  {
    id: "CMP-002",
    title: "Income Tax Filing Compliance",
    category: "Income Tax",
    status: "compliant",
    score: 95,
    date: "Dec 18, 2024",
    findings: 4,
    criticalFindings: 0
  },
  {
    id: "CMP-003",
    title: "TDS Compliance Assessment",
    category: "TDS",
    status: "partial",
    score: 78,
    date: "Dec 15, 2024",
    findings: 8,
    criticalFindings: 2
  },
  {
    id: "CMP-004",
    title: "Annual Financial Audit Report",
    category: "Financial",
    status: "compliant",
    score: 92,
    date: "Dec 10, 2024",
    findings: 5,
    criticalFindings: 0
  },
  {
    id: "CMP-005",
    title: "Statutory Compliance Review",
    category: "Statutory",
    status: "non-compliant",
    score: 45,
    date: "Dec 5, 2024",
    findings: 15,
    criticalFindings: 6
  },
  {
    id: "CMP-006",
    title: "EPF & ESIC Compliance",
    category: "Labor Law",
    status: "partial",
    score: 72,
    date: "Dec 1, 2024",
    findings: 10,
    criticalFindings: 3
  }
]

const stats = [
  { label: "Total Reports", value: "24", icon: FileText, color: "text-primary" },
  { label: "Compliant", value: "18", icon: CheckCircle, color: "text-success" },
  { label: "Partial", value: "4", icon: AlertTriangle, color: "text-warning" },
  { label: "Non-Compliant", value: "2", icon: XCircle, color: "text-destructive" }
]

function getStatusStyles(status: string) {
  switch (status) {
    case "compliant":
      return {
        bg: "bg-success/10",
        text: "text-success",
        label: "Compliant"
      }
    case "partial":
      return {
        bg: "bg-warning/10",
        text: "text-warning",
        label: "Partial"
      }
    case "non-compliant":
      return {
        bg: "bg-destructive/10",
        text: "text-destructive",
        label: "Non-Compliant"
      }
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        label: status
      }
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-destructive"
}

export default function CompliancePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredReports = complianceReports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || report.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ["all", ...new Set(complianceReports.map(r => r.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compliance Reports</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage compliance status</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search compliance reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-muted border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors">
              <Calendar className="w-4 h-4" />
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Report</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Score</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Findings</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const statusStyles = getStatusStyles(report.status)
                return (
                  <tr key={report.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{report.title}</p>
                        <p className="text-sm text-muted-foreground">{report.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                        {report.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                        {statusStyles.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              report.score >= 90 ? "bg-success" : report.score >= 70 ? "bg-warning" : "bg-destructive"
                            }`}
                            style={{ width: `${report.score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getScoreColor(report.score)}`}>
                          {report.score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{report.findings}</span>
                        {report.criticalFindings > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                            {report.criticalFindings} critical
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {report.date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/compliance/${report.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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
