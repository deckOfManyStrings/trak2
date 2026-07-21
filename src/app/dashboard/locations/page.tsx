import { CreateLocationForm } from "@/app/dashboard/locations/create-location-form";
import { LocationRow } from "@/app/dashboard/locations/location-row";
import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
import type { Location } from "@/types/db";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function LocationsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");
  if (session.profile.role !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: true });

  const locationIds = (locations ?? []).map((location) => location.id);

  const [{ data: staffLinks }, { data: clients }] = await Promise.all([
    locationIds.length
      ? supabase
          .from("staff_locations")
          .select("location_id")
          .in("location_id", locationIds)
      : Promise.resolve({ data: [] as { location_id: string }[] }),
    locationIds.length
      ? supabase
          .from("clients")
          .select("location_id")
          .in("location_id", locationIds)
      : Promise.resolve({ data: [] as { location_id: string }[] }),
  ]);

  const staffCountByLocation = new Map<string, number>();
  for (const row of staffLinks ?? []) {
    staffCountByLocation.set(
      row.location_id,
      (staffCountByLocation.get(row.location_id) ?? 0) + 1,
    );
  }

  const clientCountByLocation = new Map<string, number>();
  for (const row of clients ?? []) {
    clientCountByLocation.set(
      row.location_id,
      (clientCountByLocation.get(row.location_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Your day care sites and regional center details. Staff and clients
          are each assigned to one location.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)] lg:gap-8">
        <div className="order-first h-fit rounded-lg border bg-white p-4 lg:order-last">
          <h2 className="mb-3 text-sm font-semibold">Add a location</h2>
          {session.profile.plan === "free" &&
          (locations ?? []).length >= FREE_PLAN_LIMITS.locations ? (
            <p className="text-sm text-muted-foreground">
              You&apos;ve reached the free plan limit of{" "}
              {FREE_PLAN_LIMITS.locations} location. Upgrade to add more.
            </p>
          ) : (
            <CreateLocationForm />
          )}
        </div>

        <ul className="space-y-3">
          {(locations ?? []).length === 0 ? (
            <li className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              No locations yet. Create your first one to get started.
            </li>
          ) : (
            (locations ?? []).map((location) => (
              <LocationRow
                key={location.id}
                location={location as Location}
                staffCount={staffCountByLocation.get(location.id) ?? 0}
                clientCount={clientCountByLocation.get(location.id) ?? 0}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
