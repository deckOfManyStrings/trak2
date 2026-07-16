import "server-only";

/**
 * The only people who can reach /internal/*. Comma-separated list of emails
 * in the SUPER_ADMIN_EMAILS environment variable - not a database role, so
 * it works even before any account exists and can't be granted to a
 * customer by mistake through normal app usage.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase());
}
