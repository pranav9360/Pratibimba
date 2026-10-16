export type DateFilter = {
  mode: "all" | "from" | "until" | "month" | "range";
  start: string;
  end: string;
};

function day(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function matchesDateFilter(
  startValue: string | undefined,
  endValue: string | undefined,
  filter: DateFilter
): boolean {
  if (filter.mode === "all" || !filter.start) return true;

  const start = day(startValue);
  const end = day(endValue) || start;
  if (!start || !end) return false;

  if (filter.mode === "from") return end >= filter.start;
  if (filter.mode === "until") return start <= filter.start;

  if (filter.mode === "month") {
    const first = `${filter.start.slice(0, 7)}-01`;
    const [year, month] = filter.start.slice(0, 7).split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return true;
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return start <= last && end >= first;
  }

  if (filter.mode === "range") {
    if (!filter.end || filter.end < filter.start) return true;
    return start <= filter.end && end >= filter.start;
  }

  return true;
}
