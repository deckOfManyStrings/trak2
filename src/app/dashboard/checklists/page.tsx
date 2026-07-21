import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, Location } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ChecklistsPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: clients }, { data: locations }] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("full_name", { ascending: true }),
    supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const typedClients = (clients ?? []) as Client[];
  const locationById = new Map(
    ((locations ?? []) as Location[]).map((loc) => [loc.id, loc]),
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Progress notes</h1>
        <p className="text-sm text-muted-foreground">
          Pick a client to fill out or review their daily objectives.
        </p>
      </div>

      <ul className="space-y-3">
        {typedClients.length === 0 ? (
          <li className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
            No clients yet.
          </li>
        ) : (
          typedClients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/dashboard/checklists/${client.id}`}
                className="flex min-h-16 items-center justify-between gap-4 rounded-lg border bg-white p-4 transition-colors hover:border-foreground/30 active:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-foreground">
                    {client.full_name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {locationById.get(client.location_id)?.name ??
                      "Unassigned"}
                  </p>
                </div>
                <span className="shrink-0 text-muted-foreground" aria-hidden>
                  &rarr;
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
