import { BoardClient } from "@/app/dashboard/board/board-client";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { Client, Location, Profile } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function BoardPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/");
  if (session.profile.role !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: locations },
    { data: staff },
    { data: staffLocations },
    { data: clients },
  ] = await Promise.all([
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
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  const locationByStaffId = new Map<string, string>();
  for (const row of staffLocations ?? []) {
    locationByStaffId.set(row.staff_id, row.location_id);
  }

  const staffWithLocation = ((staff ?? []) as Profile[]).map((member) => ({
    ...member,
    locationId: locationByStaffId.get(member.id) ?? null,
  }));

  const typedLocations = (locations ?? []) as Location[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Board</h1>
        <p className="text-sm text-muted-foreground">
          Drag a card to move a staff member or client to a different
          location.
        </p>
      </div>

      {typedLocations.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
          Create at least one location to use the board.
        </p>
      ) : (
        <BoardClient
          locations={typedLocations}
          staff={staffWithLocation}
          clients={(clients ?? []) as Client[]}
        />
      )}
    </div>
  );
}
