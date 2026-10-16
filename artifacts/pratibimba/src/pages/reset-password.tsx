import { useState } from "react";
import { Link } from "wouter";
import { hasVerifiedReset, finishReset } from "../services/password-reset-flow";
import { getRequestErrorMessage as getErrorMessage } from "../services/request-errors";
import { isValidNewPassword, PASSWORD_POLICY_MESSAGE } from "../../../../shared/password-policy.mjs";
export default function ResetPasswordPage() {
  const [password,setPassword]=useState("");const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [done,setDone]=useState(false);
  return <section className="w-full max-w-md rounded-xl border bg-white p-6 sm:p-8 shadow-lg">
    <h1 className="font-headline-md mb-3">Reset Your Password</h1>
    {done ? <p role="status">Your password has been changed. <Link href="/login" className="text-primary underline">Sign in</Link> with your new password.</p> : !hasVerifiedReset() ? <p>Verify a reset code first. <Link href="/forgot-password" className="text-primary underline">Start password recovery</Link>.</p> : <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setError("");if(!isValidNewPassword(password)){setError(PASSWORD_POLICY_MESSAGE);return;}if(password!==confirmation){setError("Passwords do not match.");return;}setBusy(true);try{await finishReset(password);setPassword("");setConfirmation("");setDone(true);}catch(err){setError(getErrorMessage(err));}finally{setBusy(false);}}}>
      <p id="password-policy" className="text-sm text-on-surface-variant">{PASSWORD_POLICY_MESSAGE}</p>
      <label className="block text-sm font-medium">New Password<input required type="password" autoComplete="new-password" minLength={8} aria-describedby="password-policy" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label>
      <label className="block text-sm font-medium">Confirm New Password<input required type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label>
      {error&&<p role="alert" className="text-sm text-error">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-primary p-3 text-white disabled:opacity-50">{busy?"Updating…":"Reset Password"}</button>
    </form>}
  </section>;
}
