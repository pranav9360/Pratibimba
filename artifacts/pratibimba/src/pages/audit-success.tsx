import { Link } from "wouter";

export default function AuditSuccessPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <span className="material-symbols-outlined text-green-600 text-[40px] filled">check_circle</span>
          </div>
        </div>

        <h1 className="font-headline-md text-on-surface mb-2">Audit Submitted Successfully!</h1>
        <p className="font-body-md text-on-surface-variant mb-8">
          Your audit has been submitted and is now pending verification. You will receive a notification once it has been reviewed.
        </p>

        <div className="bg-white rounded-xl border border-outline-variant/20 p-6 mb-8 shadow-soft">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="material-symbols-outlined text-primary">description</span>
            <span className="font-headline-sm text-on-surface">Reference Number</span>
          </div>
          <div className="bg-primary/5 rounded-lg py-3 px-4 mb-4">
            <span className="font-display-lg text-primary tracking-wider">AUD-2024-8934</span>
          </div>
          <p className="font-body-md text-on-surface-variant">Please save this reference number for future tracking</p>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-2 font-body-md text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            <span>Expected verification time: 2-3 business days</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-outline-variant/20 p-6 mb-8 text-left shadow-soft">
          <h2 className="font-headline-sm text-on-surface mb-4">What happens next?</h2>
          <ul className="space-y-3">
            {[
              "Your audit documents will be reviewed by our verification team",
              "You may be contacted if additional documents are required",
              "Once verified, you will receive a confirmation notification",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-body-md font-medium flex-shrink-0 mt-0.5">{i + 1}</div>
                <p className="font-body-md text-on-surface-variant">{step}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-surface-container text-on-surface font-label-md font-medium hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[18px]">home</span>
            Go to Dashboard
          </Link>
          <Link href="/audits/new" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-on-primary font-label-md font-medium hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Submit Another Audit
          </Link>
        </div>

        <div className="mt-6">
          <Link href="/audits/AUD-2024-8934" className="inline-flex items-center gap-1 font-label-md text-primary hover:underline">
            Track your audit status
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
