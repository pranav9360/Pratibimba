import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export function FilterText({ label, value, onChange, placeholder = label }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" aria-label={`${label} filter`} aria-expanded={open}
      className={`h-11 w-full min-w-0 justify-between gap-2 rounded-xl border px-3 shadow-sm transition-colors motion-reduce:transition-none focus-visible:ring-primary sm:w-auto sm:max-w-[240px] ${value ? "border-primary/40 bg-primary/5 text-primary" : "border-outline-variant/40 bg-white text-on-surface"}`}>
      <span className="truncate">{label}{value ? `: ${value}` : ""}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" collisionPadding={12} className="w-72 max-w-[calc(100vw-24px)] space-y-2 rounded-xl border-outline-variant/30 bg-white p-3 text-on-surface shadow-lg motion-reduce:animate-none">
      <label className="block text-sm font-semibold">{label}
        <Input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === "Enter") setOpen(false); }}
          className="mt-2 h-11 rounded-lg border-outline-variant/40 bg-white text-on-surface focus-visible:ring-primary" />
      </label>
      <p className="text-xs text-on-surface-variant">Matches partial text. Changes apply immediately.</p>
      {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} className="text-primary hover:bg-primary/5 focus-visible:ring-primary">Clear {label}</Button>}
    </PopoverContent>
  </Popover>;
}
