import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface FilterOption { value: string; label: string }
interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allValue?: string;
  allLabel?: string;
  searchable?: boolean;
}

// Option values stay name-based. Empty/All sentinels remain owned by each page.
export function FilterSelect({ label, value, onChange, options, allValue = "All", allLabel = `All ${label}`, searchable = false }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const choices = [{ value: allValue, label: allLabel }, ...options.filter((option, index) =>
    option.value !== allValue && options.findIndex(other => other.value === option.value) === index)];
  if (!choices.some(option => option.value === value)) choices.push({ value, label: value });
  const selected = choices.find(option => option.value === value)?.label ?? value;
  const active = value !== allValue;
  const triggerClass = `h-11 w-full min-w-0 justify-between gap-2 rounded-xl border px-3 text-sm shadow-sm transition-colors motion-reduce:transition-none focus-visible:ring-primary sm:w-auto sm:max-w-[260px] ${active ? "border-primary/40 bg-primary/5 text-primary" : "border-outline-variant/40 bg-white text-on-surface hover:bg-surface-container-low"}`;
  if (!searchable) return <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className={triggerClass}><SelectValue>{label}: {selected}</SelectValue></SelectTrigger>
    <SelectContent className="max-h-72 rounded-xl border-outline-variant/30 bg-white text-on-surface shadow-lg motion-reduce:animate-none">
      {choices.map(option => <SelectItem key={option.value} value={option.value} className="min-h-10 rounded-lg focus:bg-primary/5 focus:text-primary">{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} className={triggerClass}>
      <span className="truncate">{label}: {selected}</span><ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="start" collisionPadding={12} className="w-72 max-w-[calc(100vw-24px)] rounded-xl border-outline-variant/30 bg-white p-1 text-on-surface shadow-lg motion-reduce:animate-none">
      <Command className="bg-white text-on-surface">
        <CommandInput aria-label={`Search ${label} options`} placeholder={`Search ${label.toLowerCase()}…`} className="text-on-surface placeholder:text-on-surface-variant/60" />
        <CommandList aria-label={`${label} options`} className="max-h-64 overscroll-contain">
          <CommandEmpty>No matching options.</CommandEmpty>
          {choices.map(option => <CommandItem key={option.value} value={option.value} keywords={[option.label]} aria-label={`${option.label}${option.value === value ? ", current filter" : ""}`}
            onSelect={() => { onChange(option.value); setOpen(false); }}
            className="min-h-10 gap-2 rounded-lg text-on-surface data-[selected=true]:bg-primary/5 data-[selected=true]:text-primary">
            <Check className={`h-4 w-4 shrink-0 ${option.value === value ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />{option.label}
          </CommandItem>)}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
