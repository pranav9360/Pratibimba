import { useParams } from 'wouter';
import AllClearWorkflow from '../components/all-clear-workflow';
export default function ZeroFindingsPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <main className="mx-auto max-w-3xl p-4 sm:p-6"><AllClearWorkflow scheduledAuditId={id} /></main>;
}
