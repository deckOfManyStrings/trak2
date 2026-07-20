export const LOCATION_SERVICE_TYPES = [
  { value: "day_program", label: "Day program" },
  { value: "adult_care_home", label: "Adult care home" },
  { value: "ils", label: "ILS" },
  { value: "sls", label: "SLS" },
] as const;

export type LocationServiceType =
  (typeof LOCATION_SERVICE_TYPES)[number]["value"];

// Starter set — more California regional centers will be added later.
export const REGIONAL_CENTERS = [
  { value: "vmrc", label: "VMRC" },
  { value: "acrc", label: "ACRC" },
  { value: "sarc", label: "SARC" },
] as const;

export type RegionalCenter = (typeof REGIONAL_CENTERS)[number]["value"];

const SERVICE_TYPE_VALUES = new Set<string>(
  LOCATION_SERVICE_TYPES.map((option) => option.value),
);

const REGIONAL_CENTER_VALUES = new Set<string>(
  REGIONAL_CENTERS.map((option) => option.value),
);

export function parseLocationServiceType(
  value: string,
): LocationServiceType | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return SERVICE_TYPE_VALUES.has(trimmed)
    ? (trimmed as LocationServiceType)
    : null;
}

export function parseRegionalCenter(value: string): RegionalCenter | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return REGIONAL_CENTER_VALUES.has(trimmed)
    ? (trimmed as RegionalCenter)
    : null;
}

export function formatLocationServiceType(value: string | null): string | null {
  if (!value) return null;
  return (
    LOCATION_SERVICE_TYPES.find((option) => option.value === value)?.label ??
    value
  );
}

export function formatRegionalCenter(value: string | null): string | null {
  if (!value) return null;
  return (
    REGIONAL_CENTERS.find((option) => option.value === value)?.label ?? value
  );
}

export const locationSelectClassName =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-2.5 md:text-sm dark:bg-input/30";
