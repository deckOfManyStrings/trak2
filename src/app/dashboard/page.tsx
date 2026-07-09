import { CreateLocationForm } from "@/app/dashboard/locations/create-location-form";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Location } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white p-5 transition-colors hover:border-foreground/30"
    >
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { profile } = session;

  if (profile.role === "admin") {
    const [locationsResult, staffResult, clientsResult] = await Promise.all([
      supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "staff"),
      supabase.from("clients").select("*", { count: "exact", head: true }),
    ]);

    const locations = (locationsResult.data ?? []) as Location[];

    if (locations.length === 0) {
      return (
        <div className="mx-auto max-w-md py-8">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Create your first location</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Locations are your day care sites. Add one to start inviting
              staff and adding clients.
            </p>
          </div>
          <div className="mt-6 rounded-lg border bg-white p-5">
            <CreateLocationForm />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            A quick look at your account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Locations"
            value={locations.length}
            href="/dashboard/locations"
          />
          <SummaryCard
            label="Staff"
            value={staffResult.count ?? 0}
            href="/dashboard/staff"
          />
          <SummaryCard
            label="Clients"
            value={clientsResult.count ?? 0}
            href="/dashboard/clients"
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Your locations
            </h2>
            <Link
              href="/dashboard/locations"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Manage
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {locations.map((location) => (
              <li key={location.id} className="rounded-lg border bg-white p-4">
                <p className="font-medium text-foreground">{location.name}</p>
                {location.address ? (
                  <p className="text-sm text-muted-foreground">
                    {location.address}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          Need to move someone between locations?{" "}
          <Link
            href="/dashboard/board"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Open the board
          </Link>{" "}
          and drag their card to a new location.
        </p>
      </div>
    );
  }

  // Staff overview: show only the location(s) they're assigned to.
  const { data: staffLocations } = await supabase
    .from("staff_locations")
    .select("location:locations(id, name, address)")
    .eq("staff_id", session.userId);

  const locations = (staffLocations ?? [])
    .map((row) => row.location)
    .filter(Boolean) as unknown as Location[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Welcome{profile.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s where you&apos;re assigned.
        </p>
      </div>

      {locations.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          You haven&apos;t been assigned to a location yet. Check back soon.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <li key={location.id} className="rounded-lg border bg-white p-4">
              <p className="font-medium text-foreground">{location.name}</p>
              {location.address ? (
                <p className="text-sm text-muted-foreground">
                  {location.address}
                </p>
              ) : null}
              <Link
                href="/dashboard/clients"
                className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-4"
              >
                View clients
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
