"use client"

import Link from "next/link"
import { CheckCircle, FileText, Clock, ArrowRight, Home, Plus } from "lucide-react"

export default function AuditSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Audit Submitted Successfully!
        </h1>
        <p className="text-muted-foreground mb-8">
          Your audit has been submitted and is now pending verification. You will receive a notification once it has been reviewed.
        </p>

        {/* Audit Reference Card */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-lg font-medium text-foreground">Reference Number</span>
          </div>
          <div className="bg-primary/5 rounded-lg py-3 px-4 mb-4">
            <span className="text-2xl font-bold text-primary tracking-wider">AUD-2024-8934</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Please save this reference number for future tracking
          </p>
        </div>

        {/* Status Info */}
        <div className="bg-muted/50 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Expected verification time: 2-3 business days</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 text-left">
          <h2 className="font-semibold text-foreground mb-4">What happens next?</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0 mt-0.5">
                1
              </div>
              <p className="text-sm text-muted-foreground">
                Your audit documents will be reviewed by our verification team
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0 mt-0.5">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                You may be contacted if additional documents are required
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0 mt-0.5">
                3
              </div>
              <p className="text-sm text-muted-foreground">
                Once verified, you will receive a confirmation notification
              </p>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            href="/audits/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Submit Another Audit
          </Link>
        </div>

        {/* Track Audit Link */}
        <div className="mt-6">
          <Link
            href="/audits/AUD-2024-8934"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Track your audit status
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
