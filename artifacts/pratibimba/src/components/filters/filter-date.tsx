import type { DateFilter } from "./date-filter-utils";

interface FilterDateProps {
  label: string;
  value: DateFilter;
  onChange: (value: DateFilter) => void;
}

export function FilterDate({ label, value, onChange }: FilterDateProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-variant/30 bg-white p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span>{label}</span>
        <select
          aria-label={`${label} filter mode`}
          value={value.mode}
          onChange={e => onChange({ mode: e.target.value as DateFilter["mode"], start: "", end: "" })}
          className="h-10 rounded-lg border border-outline-variant/40 bg-white px-2"
        >
          <option value="all">All dates</option>
          <option value="from">Starting From</option>
          <option value="until">Until</option>
          <option value="month">By Month</option>
          <option value="range">Between Dates</option>
        </select>
      </label>
      {value.mode !== "all" && (
        <label className="flex flex-col gap-1 text-sm">
          <span>{value.mode === "month" ? "Month" : "Date"}</span>
          <input
            aria-label={`${label} start`}
            type={value.mode === "month" ? "month" : "date"}
            value={value.start}
            onChange={e => onChange({ ...value, start: e.target.value })}
            className="h-10 rounded-lg border border-outline-variant/40 px-2"
          />
        </label>
      )}
      {value.mode === "range" && (
        <label className="flex flex-col gap-1 text-sm">
          <span>End date</span>
          <input
            aria-label={`${label} end`}
            type="date"
            min={value.start || undefined}
            value={value.end}
            onChange={e => onChange({ ...value, end: e.target.value })}
            className="h-10 rounded-lg border border-outline-variant/40 px-2"
          />
        </label>
      )}
    </div>
  );
}
