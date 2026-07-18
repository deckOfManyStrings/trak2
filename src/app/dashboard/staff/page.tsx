import { InviteStaffForm } from "@/app/dashboard/staff/invite-staff-form";
import { StaffRow } from "@/app/dashboard/staff/staff-row";
import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Location, Profile } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function StaffPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");
  if (session.profile.role !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: locations }, { data: staff }, { data: staffLocations }] =
    await Promise.all([
      supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff")
        .order("created_at", { ascending: true }),
      supabase.from("staff_locations").select("staff_id, location_id"),
    ]);

  const locationByStaffId = new Map<string, string>();
  for (const row of staffLocations ?? []) {
    locationByStaffId.set(row.staff_id, row.location_id);
  }

  const typedLocations = (locations ?? []) as Location[];
  const typedStaff = (staff ?? []) as Profile[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Invite staff and assign each one to a location.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="order-first h-fit rounded-lg border bg-white p-4 lg:order-last">
          <h2 className="mb-3 text-sm font-semibold">Invite staff</h2>
          {typedLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a location first so you can assign new staff to it.
            </p>
          ) : session.profile.plan === "free" &&
            typedStaff.length >= FREE_PLAN_LIMITS.staff ? (
            <p className="text-sm text-muted-foreground">
              You&apos;ve reached the free plan limit of{" "}
              {FREE_PLAN_LIMITS.staff} staff members. Upgrade to add more.
            </p>
          ) : (
            <InviteStaffForm locations={typedLocations} />
          )}
        </div>

        <ul className="space-y-3">
          {typedStaff.length === 0 ? (
            <li className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              No staff yet. Send your first invite.
            </li>
          ) : (
            typedStaff.map((member) => (
              <StaffRow
                key={member.id}
                staff={member}
                currentLocationId={locationByStaffId.get(member.id) ?? null}
                locations={typedLocations}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
