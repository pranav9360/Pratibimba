import { X } from "lucide-react";
import { Badge } from "../ui/badge";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function ActiveFilterChips({ filters }: { filters: ActiveFilter[] }) {
  if (!filters.length) return null;
  return <div className="flex flex-wrap gap-2" aria-label="Active filters">
    {filters.map(filter => <Badge key={filter.key} variant="outline" className="max-w-full gap-1 rounded-full border-primary/20 bg-primary/5 py-1 pl-3 pr-1 text-on-surface">
      <span className="min-w-0 truncate" title={`${filter.label}: ${filter.value}`}>{filter.label}: {filter.value}</span>
      <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={filter.onRemove}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Badge>)}
  </div>;
}
