"use server";

import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistValue } from "@/types/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Records (or, when value is null, clears) one checklist cell. Access is
 * enforced by the checklist_entries RLS policies (admin, or staff assigned
 * to the client's location) - this only needs to confirm there's a session
 * at all before letting the database decide.
 *
 * "Initials" are never typed in by hand: staff_id/recorded_by_name are
 * always taken from whoever is currently signed in.
 */
export async function upsertChecklistEntry(
  clientId: string,
  objectiveId: string,
  entryDate: string,
  value: ChecklistValue | null,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, owner_id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return { error: "Client not found." };
  }

  if (value === null) {
    const { error } = await supabase
      .from("checklist_entries")
      .delete()
      .eq("client_id", clientId)
      .eq("objective_id", objectiveId)
      .eq("entry_date", entryDate);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/dashboard/checklists/${clientId}`);
    return { success: true };
  }

  const recordedByName = session.profile.full_name || session.profile.email;

  const { error } = await supabase.from("checklist_entries").upsert(
    {
      client_id: clientId,
      objective_id: objectiveId,
      owner_id: client.owner_id,
      entry_date: entryDate,
      value,
      staff_id: session.userId,
      recorded_by_name: recordedByName,
    },
    { onConflict: "client_id,objective_id,entry_date" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true };
}
