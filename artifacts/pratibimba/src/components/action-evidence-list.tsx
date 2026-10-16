import { activeActionProofFiles } from "../../../../shared/evidence-status.mjs";
type Record = { _id: string; actionProofFiles?: string[]; withdrawnActionProofFiles?: {token:string;status:string;at?:string}[] };
export function ActionEvidenceList({report,onOpen,onRemove}:{report:Record;onOpen:(token:string)=>void;onRemove?:(token:string)=>void}) {
  return <div className="space-y-2 text-sm">
    {activeActionProofFiles(report).map((token,index)=><div key={token} className="flex flex-wrap gap-3"><button type="button" className="text-primary underline" onClick={()=>onOpen(token)}>View action proof {index+1}</button>{onRemove&&<button type="button" className="text-error underline" onClick={()=>onRemove(token)}>Remove / withdraw proof</button>}</div>)}
    {(report.withdrawnActionProofFiles||[]).filter(item=>item.status==="withdrawn").map(item=><p key={item.token} className="text-amber-800">Withdrawn evidence · retained in audit history{item.at?` · ${new Date(item.at).toLocaleString("en-IN")}`:""}</p>)}
  </div>;
}
