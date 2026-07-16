import { AccountRow } from "@/app/internal/accounts/account-row";
import { isSuperAdminEmail } from "@/lib/super-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Profile } from "@/types/db";
import { redirect } from "next/navigation";

/**
 * Hidden control panel for manually toggling an account's plan (free vs
 * premium). Not linked from anywhere in the app's normal navigation -
 * reachable only by URL, and gated by the SUPER_ADMIN_EMAILS allowlist
 * (see src/lib/super-admin.ts), not by the regular admin/staff role system,
 * since this needs to see across every account, not just one.
 */
export default async function InternalAccountsPage() {
  const session = await getSessionProfile();
  if (!session || !isSuperAdminEmail(session.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [{ data: admins }, { data: locations }, { data: clients }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: true }),
      admin.from("locations").select("owner_id"),
      admin.from("clients").select("owner_id"),
    ]);

  const locationCountByOwner = new Map<string, number>();
  for (const row of (locations ?? []) as { owner_id: string }[]) {
    locationCountByOwner.set(
      row.owner_id,
      (locationCountByOwner.get(row.owner_id) ?? 0) + 1,
    );
  }

  const clientCountByOwner = new Map<string, number>();
  for (const row of (clients ?? []) as { owner_id: string }[]) {
    clientCountByOwner.set(
      row.owner_id,
      (clientCountByOwner.get(row.owner_id) ?? 0) + 1,
    );
  }

  // Exclude allowlisted super-admin identities (e.g. your own login used
  // just to reach this page) - they're operator accounts, not customers to
  // manage the plan of.
  const typedAdmins = ((admins ?? []) as Profile[]).filter(
    (accountAdmin) => !isSuperAdminEmail(accountAdmin.email),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Internal control panel - toggle an account&apos;s plan by hand.
          Not linked anywhere in the app.
        </p>
      </div>

      {typedAdmins.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          No admin accounts yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {typedAdmins.map((accountAdmin) => (
            <AccountRow
              key={accountAdmin.id}
              profile={accountAdmin}
              locationCount={locationCountByOwner.get(accountAdmin.id) ?? 0}
              clientCount={clientCountByOwner.get(accountAdmin.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
