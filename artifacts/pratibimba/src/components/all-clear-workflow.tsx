import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useApp } from '../context/app-context';
import api from '../services/api';
import { getRequestErrorMessage } from '../services/request-errors';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from './ui/alert-dialog';

type History = { action: string; by: string; name?: string; role?: string; remark: string; at: string };
type Status = {
  audit: { iqaNumber: string; prakalpa: string; startDate: string; endDate: string; leadAuditor: string; auditCoordinator: string; status: string; completedAt?: string };
  declaration: { remark: string; status: string; coordinatorRemark?: string; approvedAt?: string; createdAt?: string; history?: History[] } | null;
  eligibility: { eligible: boolean; reason: string };
};
const date = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', timeZoneName: 'short' }) : 'Not recorded';

export default function AllClearWorkflow({ scheduledAuditId, compact = false }: { scheduledAuditId: string; compact?: boolean }) {
  const { currentUser } = useApp();
  const [, navigate] = useLocation();
  const [data, setData] = useState<Status | null>(null);
  const [remark, setRemark] = useState('');
  const [decisionRemark, setDecisionRemark] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const url = `/zero-findings/scheduled-audits/${encodeURIComponent(scheduledAuditId)}`;
  useEffect(() => {
    const current = ++generation.current;
    setData(null); setError(''); setNotice(''); setRemark(''); setConfirmed(false); setOpen(false);
    void api.get(url).then(response => { if (current === generation.current) setData(response.data.data); })
      .catch(error => { if (current === generation.current) setError(getRequestErrorMessage(error, 'Unable to verify All Clear eligibility. Refresh to retry.')); });
    return () => { generation.current++; };
  }, [url]);
  async function act(path: string, body: object) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const current = generation.current;
    try {
      const saved = await api.post(`${url}/${path}`, body);
      if (current !== generation.current) return;
      setOpen(false);
      setData(previous => previous ? { ...previous, declaration: saved.data.data, eligibility: { eligible: false, reason: 'Declaration submitted.' } } : previous);
      setNotice(path === 'submit' ? 'All Clear sent to the Audit Coordinator. The audit remains open pending review and completion.' : 'Decision recorded.');
      const response = await api.get(url);
      if (current === generation.current) setData(response.data.data);
    } catch (error) { if (current === generation.current) setError(getRequestErrorMessage(error)); }
    finally { pending.current = false; setBusy(false); }
  }
  const record = data?.declaration;
  const lead = currentUser?.role === 'auditor' && currentUser.name === data?.audit.leadAuditor;
  const coordinator = currentUser?.role === 'audit_coordinator' && currentUser.name === data?.audit.auditCoordinator;
  const submitted = record?.history?.filter(item => item.action === 'submitted').at(-1)?.at || record?.createdAt;
  return <section className="space-y-4 rounded-xl border border-blue-200 bg-surface-container-low p-4" aria-label="All Clear workflow">
    {!compact && <h1 className="text-xl font-semibold">No Findings — Audit Satisfactory</h1>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    {!data && !error && <p role="status">Checking All Clear eligibility…</p>}
    {data && <>
      {!compact && <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {Object.entries({ 'IQA ID': data.audit.iqaNumber, Prakalpa: data.audit.prakalpa, 'Scheduled start': date(data.audit.startDate), 'Scheduled end': date(data.audit.endDate), 'Lead Auditor': data.audit.leadAuditor, Coordinator: data.audit.auditCoordinator, Status: data.audit.status === 'completed' && record?.status === 'approved' ? 'COMPLETED · All Clear' : data.audit.status }).map(([key, value]) => <div key={key}><dt className="text-on-surface-variant">{key}</dt><dd className="font-medium break-words">{value}</dd></div>)}
      </dl>}
      {record && <div className="space-y-2 text-sm">
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-800">{record.status === 'submitted' ? 'All Clear Received' : record.status === 'approved' ? 'All Clear Approved' : 'All Clear Returned'}</span>
        <p className="whitespace-pre-wrap break-words"><strong>Declaration:</strong> {record.remark}</p>
        {record.coordinatorRemark && <p className="whitespace-pre-wrap break-words"><strong>Coordinator decision:</strong> {record.coordinatorRemark}</p>}
        {!compact && <><p>Submission date: {date(submitted)}</p><p>Approval date: {date(record.approvedAt)}</p>
          <h2 className="font-semibold">Decision history</h2><ol className="space-y-2">{record.history?.map((item, index) => <li key={index} className="border-l-2 border-blue-200 pl-3 break-words"><span className="font-medium">{item.action}</span> · {date(item.at)} · {item.name || `Account ${item.by}`} {item.role && `(${item.role.replaceAll('_', ' ')})`}<p className="whitespace-pre-wrap">{item.remark}</p></li>)}</ol></>}
      </div>}
      {lead && (!record || record.status === 'returned') && <>
        {!data.eligibility.eligible && <p className="text-sm text-on-surface-variant">{data.eligibility.reason}</p>}
        {data.eligibility.eligible && <>
          <label className="block text-sm font-medium" htmlFor={`declaration-${scheduledAuditId}`}>Lead Auditor declaration</label>
          <textarea id={`declaration-${scheduledAuditId}`} rows={3} maxLength={4000} value={remark} disabled={busy} onChange={event => setRemark(event.target.value)} className="w-full rounded-lg border bg-surface p-3 text-sm" />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm the audit is complete, I have reviewed every assigned Auditor’s work and explicit zero-finding submission, and no findings exist.</label>
          <AlertDialog open={open} onOpenChange={value => { if (!pending.current) setOpen(value); }}>
            <AlertDialogTrigger asChild><button type="button" disabled={busy || !confirmed || !remark.trim()} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">Send All Clear</button></AlertDialogTrigger>
            <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto" onEscapeKeyDown={event => { if (pending.current) event.preventDefault(); }}>
              <AlertDialogHeader><AlertDialogTitle>Confirm All Clear Submission</AlertDialogTitle><AlertDialogDescription>No findings have been recorded for this audit. Are you sure you want to submit an All Clear declaration to the Audit Coordinator?</AlertDialogDescription></AlertDialogHeader>
              {error && <p role="alert" className="text-sm text-error">{error}</p>}
              <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button type="button" disabled={busy} onClick={() => void act('submit', { remark, workCompleted: confirmed })} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{busy ? 'Sending…' : 'Confirm & Send All Clear'}</button></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>}
      </>}
      {coordinator && record?.status === 'submitted' && <div className="space-y-3">
        <label htmlFor="all-clear-decision" className="block text-sm font-medium">Review All Clear — reason required for return</label>
        <textarea id="all-clear-decision" rows={3} maxLength={4000} value={decisionRemark} disabled={busy} onChange={event => setDecisionRemark(event.target.value)} className="w-full rounded-lg border bg-surface p-3 text-sm" />
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void act('decision', { decision: 'approve', remark: decisionRemark })} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{busy ? 'Saving…' : 'Approve All Clear'}</button><button type="button" disabled={busy || !decisionRemark.trim()} onClick={() => void act('decision', { decision: 'return', remark: decisionRemark })} className="rounded-lg border px-4 py-2 disabled:opacity-50">Return for Revision</button></div>
      </div>}
      {record?.status === 'approved' && data.audit.status !== 'completed' && <p className="text-sm">Approval recorded. Complete the audit through Scheduled Audits; the backend rechecks the end time and approved outcome.</p>}
      {!compact && <button type="button" onClick={() => navigate('/scheduled-audits')} className="text-sm font-semibold text-primary underline">Back to Scheduled Audits</button>}
    </>}
  </section>;
}
