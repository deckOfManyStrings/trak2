export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  { value: "parent", label: "Parent" },
  { value: "home_provider", label: "Home Provider" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Relative" },
  { value: "self", label: "Self" },
] as const;

export type EmergencyContactRelationship =
  (typeof EMERGENCY_CONTACT_RELATIONSHIPS)[number]["value"];

const RELATIONSHIP_VALUES = new Set<string>(
  EMERGENCY_CONTACT_RELATIONSHIPS.map((option) => option.value),
);

export function parseEmergencyContactRelationship(
  value: string,
): EmergencyContactRelationship | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return RELATIONSHIP_VALUES.has(trimmed)
    ? (trimmed as EmergencyContactRelationship)
    : null;
}

export function formatEmergencyContactRelationship(
  value: string | null,
): string | null {
  if (!value) return null;
  return (
    EMERGENCY_CONTACT_RELATIONSHIPS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export const selectClassName =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-2.5 md:text-sm dark:bg-input/30";
