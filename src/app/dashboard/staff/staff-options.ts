export const STAFF_SHIFT_TIMES = [
  { value: "am", label: "AM" },
  { value: "pm", label: "PM" },
  { value: "noc", label: "NOC" },
] as const;

export type StaffShiftTime = (typeof STAFF_SHIFT_TIMES)[number]["value"];

const SHIFT_VALUES = new Set<string>(
  STAFF_SHIFT_TIMES.map((option) => option.value),
);

export function parseStaffShiftTime(value: string): StaffShiftTime | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return SHIFT_VALUES.has(trimmed) ? (trimmed as StaffShiftTime) : null;
}

export function formatStaffShiftTime(value: string | null): string | null {
  if (!value) return null;
  return (
    STAFF_SHIFT_TIMES.find((option) => option.value === value)?.label ?? value
  );
}

export const staffSelectClassName =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-2.5 md:text-sm dark:bg-input/30";
