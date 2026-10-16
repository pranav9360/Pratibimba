import { isValidNewPassword, PASSWORD_POLICY_MESSAGE } from "../../../../shared/password-policy.mjs";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useApp } from "../context/app-context";
import type { FormEvent } from "react";
import api from "../services/api";
import { clearAuthenticatedSession } from "../services/authService";

type View = "menu" | "password" | "support";
export function AccountCenter({onLogout}:{onLogout:()=>void}) {
 const { currentUser } = useApp();
 const [open,setOpen]=useState(false);
 const [view,setView]=useState<View>("menu");
 const [recipients,setRecipients]=useState<string[]>([]);
 const [subject,setSubject]=useState(""); const [message,setMessage]=useState("");
 const [currentPassword,setCurrentPassword]=useState(""); const [newPassword,setNewPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState("");
 const [busy,setBusy]=useState(false); const [notice,setNotice]=useState(""); const [error,setError]=useState("");
 useEffect(()=>{ if(open&&view==="support") { api.get("/account/support-recipients").then(r=>setRecipients(r.data?.data?.recipients||[])).catch(()=>setError("Unable to load administrator recipients.")); } },[open,view]);
 const close=()=>{setOpen(false);setView("menu");setNotice("");setError("");setCurrentPassword("");setNewPassword("");setConfirmPassword("");};
 const submitSupport=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await api.post("/account/support",{subject,message});setNotice(r.data?.message||"Support email sent.");setSubject("");setMessage("");}catch(e:any){setError(e.response?.data?.message||"Unable to send support email. Check server SMTP configuration.");}finally{setBusy(false);}};
 const submitPassword=async(e:FormEvent)=>{e.preventDefault();setError("");setNotice("");if(!isValidNewPassword(newPassword)){setError(PASSWORD_POLICY_MESSAGE);return;}if(newPassword!==confirmPassword){setError("New passwords do not match.");return;}setBusy(true);try{await api.post("/account/change-password",{currentPassword,newPassword});setNotice("Password changed. Please sign in again.");setCurrentPassword("");setNewPassword("");setConfirmPassword("");clearAuthenticatedSession();setTimeout(()=>window.location.assign("/login"),1800);}catch(e:any){setError(e.response?.data?.message||"Password change failed.");}finally{setBusy(false);}};
 return <div className="relative">
  <button type="button" onClick={()=>{setOpen(v=>!v);setView("menu");}} className="w-full flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5 text-white text-sm hover:bg-white/20" aria-expanded={open}><span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">account_circle</span>Account</span><span className="material-symbols-outlined">expand_more</span></button>
  {open&&<div className="absolute bottom-full mb-2 left-0 right-0 z-[90] rounded-xl bg-white shadow-xl border border-slate-200 p-2 text-slate-800">
   {view==="menu" ? <div className="space-y-1">{currentUser?.role === "prakalpa_manager" && <Link href="/my-prakalpas" onClick={close} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"><span className="material-symbols-outlined text-lg">account_tree</span>My Prakalpas</Link>}{([ ["password","Change Password","lock"],["support","Help & Support","help"]] as const).map(([v,label,icon])=><button key={v} type="button" onClick={()=>{setView(v);setError("");setNotice("");}} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"><span className="material-symbols-outlined text-lg">{icon}</span>{label}</button>)}<button type="button" onClick={()=>{close();onLogout();}} className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"><span className="material-symbols-outlined text-lg">logout</span>Logout</button></div> : <button type="button" onClick={()=>{setView("menu");setError("");setNotice("");}} className="text-xs text-slate-600 hover:underline px-2 py-1">← Back to account</button>}
  </div>}
  {open&&view!=="menu"&&<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={view==="support"?"Help and Support":"Change Password"}>
    <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-slate-800">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{view==="support"?"Help & Support":"Change Password"}</h2><button type="button" onClick={close} aria-label="Close" className="text-2xl">×</button></div>

      {view==="support"&&<form onSubmit={submitSupport} className="space-y-3"><label className="block text-sm font-semibold">To<div className="mt-1 rounded-lg bg-slate-100 border p-3 font-normal text-sm break-all">superadmin@pratibimba.com</div></label><label className="block text-sm font-semibold">CC (Active Admins)<div className="mt-1 rounded-lg bg-slate-100 border p-3 font-normal text-sm break-all">{recipients.length?recipients.join(", "):"No active admin email addresses found"}</div></label><label className="block text-sm font-semibold">Subject<input required minLength={3} maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label><label className="block text-sm font-semibold">Describe your issue<textarea required minLength={10} maxLength={5000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{busy?"Sending…":"Send Support Email"}</button></form>}
      {view==="password"&&<form onSubmit={submitPassword} className="space-y-3">{([ ["Current password",currentPassword,setCurrentPassword],["New password",newPassword,setNewPassword],["Confirm new password",confirmPassword,setConfirmPassword]] as const).map(([label,value,setValue])=><label key={label} className="block text-sm font-semibold">{label}<input type="password" autoComplete={label==="Current password"?"current-password":"new-password"} required minLength={label==="Current password"?1:8} value={value} onChange={e=>setValue(e.target.value)} className="mt-1 w-full rounded-lg border p-3 font-normal" /></label>)}<p className="text-xs text-slate-500">At least 8 characters, including a letter and a number. Uppercase and symbols are optional. You will be signed out after changing your password.</p><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">{busy?"Updating…":"Change Password"}</button></form>}
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    </div></div>}
 </div>;
}
