import { ClientRow } from "@/app/dashboard/clients/client-row";
import { CreateClientForm } from "@/app/dashboard/clients/create-client-form";
import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, Location } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ClientsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const isAdmin = session.profile.role === "admin";

  const [{ data: clients }, { data: locations }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const typedClients = (clients ?? []) as Client[];
  const typedLocations = (locations ?? []) as Location[];
  const locationById = new Map(typedLocations.map((loc) => [loc.id, loc]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Everyone you're caring for, across all locations."
            : "Clients at your assigned location."}
        </p>
      </div>

      <div
        className={isAdmin ? "grid gap-8 lg:grid-cols-[1fr_320px]" : undefined}
      >
        <ul className="space-y-3">
          {typedClients.length === 0 ? (
            <li className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
              {isAdmin
                ? "No clients yet. Add your first one."
                : "No clients here yet."}
            </li>
          ) : (
            typedClients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                location={locationById.get(client.location_id) ?? null}
                locations={typedLocations}
                canReassign={isAdmin}
                canDelete={isAdmin}
              />
            ))
          )}
        </ul>

        {isAdmin ? (
          <div className="h-fit rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Add a client</h2>
            {typedLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a location first.
              </p>
            ) : session.profile.plan === "free" &&
              typedClients.length >= FREE_PLAN_LIMITS.clients ? (
              <p className="text-sm text-muted-foreground">
                You&apos;ve reached the free plan limit of{" "}
                {FREE_PLAN_LIMITS.clients} clients. Upgrade to add more.
              </p>
            ) : (
              <CreateClientForm locations={typedLocations} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
