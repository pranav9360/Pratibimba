import { useState } from "react";
import { Link, useLocation } from "wouter";
import { requestReset } from "../services/password-reset-flow";
import { getRequestErrorMessage as getErrorMessage } from "../services/request-errors";
export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <section className="w-full max-w-md rounded-xl border bg-white p-6 sm:p-8 shadow-lg">
    <h1 className="font-headline-md mb-3">Forgot Password?</h1>
    <p className="text-sm text-on-surface-variant mb-5">If an active account matches, a reset code will be sent to its registered email. Codes expire after 10 minutes.</p>
    <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if(busy)return;setBusy(true);setError("");try{await requestReset(identifier);navigate("/otp-verification");}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}}>
      <label className="block text-sm font-medium">Email or Mobile Number<input required autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-primary p-3 text-white disabled:opacity-50">{busy ? "Sending…" : "Send Reset Code"}</button>
    </form><Link href="/login" className="mt-5 block text-sm text-primary">Back to Sign In</Link>
  </section>;
}
