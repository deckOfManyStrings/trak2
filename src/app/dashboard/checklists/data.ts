import type { ChecklistValue } from "@/types/db";

export const CHECKLIST_VALUES: {
  value: ChecklistValue;
  label: string;
  description: string;
}[] = [
  { value: "Y", label: "Y", description: "Yes" },
  { value: "N", label: "N", description: "No" },
  { value: "H", label: "H", description: "Holiday" },
  { value: "A", label: "A", description: "Absent" },
  { value: "N/A", label: "N/A", description: "Not applicable" },
];

// Seeded for every new client by the clients_seed_objectives trigger
// (see 0017_per_client_objectives.sql). Kept here so the app and the
// migration stay in sync if the defaults ever change.
export const DEFAULT_OBJECTIVE_TITLES = [
  "Ask for help",
  "Follow outing directions",
  "State preference",
] as const;

const MONTH_PARAM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonthParam(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeMonthParam(month: string | undefined | null): string {
  if (month && MONTH_PARAM_RE.test(month)) return month;
  return currentMonthParam();
}

function parseMonthParam(month: string): { year: number; monthIndex: number } {
  const [year, monthNum] = month.split("-").map(Number);
  return { year, monthIndex: monthNum - 1 };
}

export function daysInMonth(month: string): number {
  const { year, monthIndex } = parseMonthParam(month);
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthLabel(month: string): string {
  const { year, monthIndex } = parseMonthParam(month);
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function adjacentMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonthParam(month);
  const date = new Date(year, monthIndex + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function entryDateFor(month: string, day: number): string {
  const { year, monthIndex } = parseMonthParam(month);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthDateRange(month: string): { start: string; end: string } {
  const total = daysInMonth(month);
  return { start: entryDateFor(month, 1), end: entryDateFor(month, total) };
}

// "Bobby Kingsada" -> "BK", "Jordan" -> "JO", falls back to "" when there's
// nothing to initialize (e.g. a cell nobody has recorded yet).
export function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
