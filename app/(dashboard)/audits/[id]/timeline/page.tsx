"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { 
  ChevronLeft,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Send,
  Eye,
  Shield,
  Flag
} from "lucide-react"

const timelineEvents = [
  {
    id: 1,
    title: "Audit Submitted",
    description: "Initial audit submission by Rajesh Kumar",
    timestamp: "Dec 15, 2024 - 09:30 AM",
    status: "completed",
    icon: Send,
    user: "Rajesh Kumar",
    details: "Audit documents uploaded including GST returns, financial statements, and compliance certificates."
  },
  {
    id: 2,
    title: "Document Verification Started",
    description: "Verification process initiated by Priya Sharma",
    timestamp: "Dec 15, 2024 - 10:45 AM",
    status: "completed",
    icon: Eye,
    user: "Priya Sharma",
    details: "All submitted documents are being reviewed for completeness and accuracy."
  },
  {
    id: 3,
    title: "Additional Documents Requested",
    description: "Request for supplementary documentation",
    timestamp: "Dec 16, 2024 - 02:15 PM",
    status: "completed",
    icon: AlertTriangle,
    user: "Priya Sharma",
    details: "Bank statements for Q3 2024 and updated TDS certificates required."
  },
  {
    id: 4,
    title: "Documents Uploaded",
    description: "Additional documents submitted by auditor",
    timestamp: "Dec 17, 2024 - 11:00 AM",
    status: "completed",
    icon: FileText,
    user: "Rajesh Kumar",
    details: "Requested bank statements and TDS certificates have been uploaded."
  },
  {
    id: 5,
    title: "Quality Review",
    description: "Audit under quality assurance review",
    timestamp: "Dec 18, 2024 - 09:00 AM",
    status: "in-progress",
    icon: Shield,
    user: "Amit Verma",
    details: "Senior auditor reviewing the complete audit package for compliance."
  },
  {
    id: 6,
    title: "Final Approval",
    description: "Pending final approval from supervisor",
    timestamp: "Pending",
    status: "pending",
    icon: UserCheck,
    user: "Pending Assignment",
    details: "Awaiting quality review completion before final approval."
  },
  {
    id: 7,
    title: "Audit Completion",
    description: "Audit finalized and archived",
    timestamp: "Pending",
    status: "pending",
    icon: Flag,
    user: "System",
    details: "Audit will be marked as complete and archived for records."
  }
]

function getStatusStyles(status: string) {
  switch (status) {
    case "completed":
      return {
        bg: "bg-success/10",
        border: "border-success",
        icon: "text-success",
        line: "bg-success"
      }
    case "in-progress":
      return {
        bg: "bg-warning/10",
        border: "border-warning",
        icon: "text-warning",
        line: "bg-warning"
      }
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        icon: "text-muted-foreground",
        line: "bg-border"
      }
  }
}

export default function AuditTimelinePage() {
  const params = useParams()
  const auditId = params.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/audits/${auditId}`}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Timeline</h1>
          <p className="text-sm text-muted-foreground">AUD-{auditId} Process History</p>
        </div>
      </div>

      {/* Timeline Progress */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Progress Overview</h2>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Started Dec 15, 2024</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
          </div>
          <span className="text-sm font-medium text-foreground">65%</span>
        </div>
        <p className="text-sm text-muted-foreground">4 of 7 stages completed</p>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Process Timeline</h2>
        
        <div className="relative">
          {timelineEvents.map((event, index) => {
            const styles = getStatusStyles(event.status)
            const Icon = event.icon
            const isLast = index === timelineEvents.length - 1

            return (
              <div key={event.id} className="relative flex gap-4 pb-8">
                {/* Vertical Line */}
                {!isLast && (
                  <div 
                    className={`absolute left-5 top-12 w-0.5 h-[calc(100%-3rem)] ${styles.line}`}
                  />
                )}
                
                {/* Icon */}
                <div 
                  className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${styles.bg} ${styles.border}`}
                >
                  <Icon className={`w-5 h-5 ${styles.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-medium text-foreground">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === "completed" 
                          ? "bg-success/10 text-success"
                          : event.status === "in-progress"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {event.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {event.status === "in-progress" && <Clock className="w-3 h-3 mr-1" />}
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1).replace("-", " ")}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 mt-2">
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-muted-foreground">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {event.timestamp}
                      </span>
                      <span className="text-muted-foreground">
                        <UserCheck className="w-4 h-4 inline mr-1" />
                        {event.user}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{event.details}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
