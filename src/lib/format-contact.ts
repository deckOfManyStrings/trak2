/** Formats digits into (555) 555-5555 as the user types. */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Formats ZIP as 12345 or 12345-6789. */
export function formatZip(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export function composeAddress(parts: AddressParts): string {
  const street = parts.street.trim();
  const city = parts.city.trim();
  const state = parts.state.trim().toUpperCase();
  const zip = parts.zip.trim();
  const stateZip = [state, zip].filter(Boolean).join(" ");
  return [street, city, stateZip].filter(Boolean).join(", ");
}

/** Best-effort parse of "street, city, ST 12345" back into fields. */
export function parseAddress(value: string): AddressParts {
  const trimmed = value.trim();
  if (!trimmed) {
    return { street: "", city: "", state: "", zip: "" };
  }

  const match = trimmed.match(
    /^(.+),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/,
  );
  if (match) {
    return {
      street: match[1].trim(),
      city: match[2].trim(),
      state: match[3].toUpperCase(),
      zip: match[4],
    };
  }

  return { street: trimmed, city: "", state: "", zip: "" };
}
