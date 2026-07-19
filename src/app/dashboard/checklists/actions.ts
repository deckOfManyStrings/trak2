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

/**
 * Adds an objective to one client's checklist. Access is enforced by the
 * objectives RLS policies (admin, or staff assigned to the client's
 * location).
 */
export async function createObjective(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!clientId) {
    return { error: "Missing client." };
  }
  if (!title) {
    return { error: "Objective title is required." };
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

  const { data: existing } = await supabase
    .from("objectives")
    .select("position")
    .eq("client_id", clientId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing.length > 0 ? existing[0].position + 1 : 1;

  const { error } = await supabase.from("objectives").insert({
    owner_id: client.owner_id,
    client_id: clientId,
    title,
    position: nextPosition,
    status: "active",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true };
}

/**
 * Renames an objective. Marks stay attached to the same id.
 */
export async function updateObjective(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const objectiveId = String(formData.get("objectiveId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!clientId || !objectiveId) {
    return { error: "Missing objective." };
  }
  if (!title) {
    return { error: "Objective title is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("objectives")
    .update({ title })
    .eq("id", objectiveId)
    .eq("client_id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true };
}

/**
 * Hides an objective from the daily checklist while keeping all marks.
 */
export async function retireObjective(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setObjectiveStatus(formData, "retired");
}

/**
 * Restores a retired objective to the daily checklist.
 */
export async function reactivateObjective(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setObjectiveStatus(formData, "active");
}

/**
 * Retires or reactivates based on form field nextStatus. Used by the
 * manage panel so one useActionState can handle both directions.
 */
export async function toggleObjectiveStatus(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nextStatus = String(formData.get("nextStatus") ?? "");
  if (nextStatus === "retired") {
    return setObjectiveStatus(formData, "retired");
  }
  if (nextStatus === "active") {
    return setObjectiveStatus(formData, "active");
  }
  return { error: "Invalid status change." };
}

async function setObjectiveStatus(
  formData: FormData,
  status: "active" | "retired",
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const objectiveId = String(formData.get("objectiveId") ?? "");

  if (!clientId || !objectiveId) {
    return { error: "Missing objective." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("objectives")
    .update({ status })
    .eq("id", objectiveId)
    .eq("client_id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true };
}

/**
 * Permanently removes an objective and cascade-deletes its daily marks.
 * Prefer retiring when the skill is simply no longer tracked. Access is
 * enforced by RLS; the UI requires a stronger confirm when marks exist.
 */
export async function deleteObjective(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const objectiveId = String(formData.get("objectiveId") ?? "");

  if (!clientId || !objectiveId) {
    return { error: "Missing objective." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { count, error: countError } = await supabase
    .from("checklist_entries")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("objective_id", objectiveId);

  if (countError) {
    return { error: countError.message };
  }

  const entryCount = count ?? 0;
  if (entryCount > 0) {
    const confirmed = String(formData.get("confirmDelete") ?? "") === "1";
    if (!confirmed) {
      return {
        error: `This objective has ${entryCount} daily mark${
          entryCount === 1 ? "" : "s"
        }. Retire it to keep history, or confirm permanent delete.`,
      };
    }
  }

  const { error } = await supabase
    .from("objectives")
    .delete()
    .eq("id", objectiveId)
    .eq("client_id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true };
}
