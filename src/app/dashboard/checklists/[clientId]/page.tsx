import { ChecklistDayView } from "@/app/dashboard/checklists/[clientId]/checklist-day-view";
import { ChecklistGrid } from "@/app/dashboard/checklists/[clientId]/checklist-grid";
import { ManageObjectives } from "@/app/dashboard/checklists/[clientId]/manage-objectives";
import { monthDateRange, normalizeMonthParam } from "@/app/dashboard/checklists/data";
import { getClientObjectives } from "@/app/dashboard/checklists/objectives";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistEntry, Client } from "@/types/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function ClientChecklistPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getSessionProfile();
  if (!session) redirect("/");

  const [{ clientId }, { month: monthParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const month = normalizeMonthParam(monthParam);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();

  const typedClient = client as Client;
  const objectives = await getClientObjectives(supabase, clientId);

  const { start, end } = monthDateRange(month);
  const { data: entries } = await supabase
    .from("checklist_entries")
    .select("*")
    .eq("client_id", clientId)
    .gte("entry_date", start)
    .lte("entry_date", end);

  const currentUserName =
    session.profile.full_name || session.profile.email || "You";
  const typedEntries = (entries ?? []) as ChecklistEntry[];

  return (
    <div className="space-y-6">
      <ManageObjectives
        clientId={clientId}
        clientName={typedClient.full_name}
        month={month}
        objectives={objectives}
      />

      <div className="md:hidden">
        <ChecklistDayView
          clientId={clientId}
          month={month}
          objectives={objectives}
          entries={typedEntries}
          currentUserName={currentUserName}
        />
      </div>

      <div className="hidden md:block">
        <ChecklistGrid
          clientId={clientId}
          month={month}
          objectives={objectives}
          entries={typedEntries}
          currentUserName={currentUserName}
        />
      </div>
    </div>
  );
}
