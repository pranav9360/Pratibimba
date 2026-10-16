import { useState } from "react";
import { Link, useLocation } from "wouter";
import { hasResetIdentity, verifyReset, resendReset } from "../services/password-reset-flow";
import { getRequestErrorMessage as getErrorMessage } from "../services/request-errors";
export default function OTPVerificationPage() {
  const [, navigate] = useLocation(); const [code,setCode] = useState("");
  const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const [notice,setNotice] = useState("");
  return <section className="w-full max-w-md rounded-xl border bg-white p-6 sm:p-8 shadow-lg">
    <h1 className="font-headline-md mb-3">Verify Reset Code</h1>
    {!hasResetIdentity() ? <p>Reset verification has not started or this page was reloaded. <Link href="/forgot-password" className="text-primary underline">Request a new code</Link>.</p> : <>
      <p className="mb-5 text-sm text-on-surface-variant">If your account is active, check its registered email for the six-digit code.</p>
      <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError("");try{await verifyReset(code);navigate("/reset-password");}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}}>
        <label className="block text-sm font-medium">Verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} className="mt-2 w-full rounded-lg border p-3 tracking-widest"/></label>
        <button disabled={busy || code.length!==6} className="w-full rounded-lg bg-primary p-3 text-white disabled:opacity-50">{busy?"Verifying…":"Verify Code"}</button>
      </form><button type="button" disabled={busy} className="mt-4 text-sm text-primary underline" onClick={async()=>{setBusy(true);setError("");try{await resendReset();setNotice("If an active account matches, a new code has been sent.");}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}}>Resend Code</button>
    </>}{error&&<p role="alert" className="mt-3 text-sm text-error">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm">{notice}</p>}
  </section>;
}
