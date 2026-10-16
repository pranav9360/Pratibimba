import { Link } from "wouter";
export default function HelpPage() {
  return <section className="w-full max-w-xl rounded-xl border bg-white p-6 sm:p-8 shadow-lg space-y-5">
    <h1 className="font-headline-md">Help &amp; Support</h1>
    <p className="text-sm text-on-surface-variant">For account access or Pratibimba support, contact your organization’s administrator.</p>
    <div className="space-y-2 text-sm"><h2 className="font-semibold">Trouble signing in?</h2><p>Check your email or mobile number. Use <Link href="/forgot-password" className="text-primary underline">Forgot Password</Link> to request a time-limited reset code. If your account is inactive or you cannot access its registered email, ask your administrator for help.</p></div>
    <div className="space-y-2 text-sm"><h2 className="font-semibold">Contact support</h2><p>The application’s existing support mailbox is <a className="text-primary underline break-all" href="mailto:superadmin@pratibimba.com">superadmin@pratibimba.com</a>. Signed-in users can also use Account → Help &amp; Support.</p><p>Describe the page and problem. Never send your password, reset code or authentication token.</p></div>
    <Link href="/login" className="inline-block text-sm font-semibold text-primary">Back to Sign In</Link>
  </section>;
}
