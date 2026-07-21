"use server";

import { CHECKLIST_VALUES, monthDateRange } from "@/app/dashboard/checklists/data";
import { parseChecklistImportXlsx } from "@/app/dashboard/checklists/import-checklist-xlsx";
import { getClientObjectives } from "@/app/dashboard/checklists/objectives";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import type { ChecklistValue } from "@/types/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type BulkChecklistCell = {
  objectiveId: string;
  entryDate: string;
  value: ChecklistValue;
};

export type BulkUpsertMode = "fillEmpty" | "overwrite";

const VALID_CHECKLIST_VALUES = new Set<string>(
  CHECKLIST_VALUES.map((option) => option.value),
);

const ENTRY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BULK_CELLS = 400;

function isChecklistValue(value: string): value is ChecklistValue {
  return VALID_CHECKLIST_VALUES.has(value);
}

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
 * Records many checklist cells in one round trip. Used by Excel import and
 * the desktop grid range Set-to action. Initials always come from the
 * signed-in user (same as single-cell upsert).
 *
 * mode "fillEmpty" skips cells that already have a mark; "overwrite"
 * replaces existing values.
 */
export async function bulkUpsertChecklistEntries(
  clientId: string,
  cells: BulkChecklistCell[],
  mode: BulkUpsertMode = "fillEmpty",
): Promise<ActionState & { written?: number }> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  if (!Array.isArray(cells) || cells.length === 0) {
    return { error: "Nothing to save." };
  }
  if (cells.length > MAX_BULK_CELLS) {
    return { error: `Too many cells (max ${MAX_BULK_CELLS}).` };
  }

  const normalized: BulkChecklistCell[] = [];
  for (const cell of cells) {
    if (!cell.objectiveId || !ENTRY_DATE_RE.test(cell.entryDate)) {
      return { error: "Invalid cell date or objective." };
    }
    if (!isChecklistValue(cell.value)) {
      return { error: `Invalid value: ${cell.value}` };
    }
    normalized.push({
      objectiveId: cell.objectiveId,
      entryDate: entryDateOnly(cell.entryDate),
      value: cell.value,
    });
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

  let toWrite = normalized;

  if (mode === "fillEmpty") {
    const objectiveIds = [...new Set(normalized.map((c) => c.objectiveId))];
    const dates = [...new Set(normalized.map((c) => c.entryDate))];
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));

    const { data: existing, error: existingError } = await supabase
      .from("checklist_entries")
      .select("objective_id, entry_date")
      .eq("client_id", clientId)
      .in("objective_id", objectiveIds)
      .gte("entry_date", minDate)
      .lte("entry_date", maxDate);

    if (existingError) {
      return { error: existingError.message };
    }

    const taken = new Set(
      (existing ?? []).map(
        (row) => `${row.objective_id}:${row.entry_date}`,
      ),
    );
    toWrite = normalized.filter(
      (cell) => !taken.has(`${cell.objectiveId}:${cell.entryDate}`),
    );
  }

  if (toWrite.length === 0) {
    return { success: true, written: 0 };
  }

  const recordedByName = session.profile.full_name || session.profile.email;

  const { error } = await supabase.from("checklist_entries").upsert(
    toWrite.map((cell) => ({
      client_id: clientId,
      objective_id: cell.objectiveId,
      owner_id: client.owner_id,
      entry_date: cell.entryDate,
      value: cell.value,
      staff_id: session.userId,
      recorded_by_name: recordedByName,
    })),
    { onConflict: "client_id,objective_id,entry_date" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true, written: toWrite.length };
}

export type BulkChecklistKey = {
  objectiveId: string;
  entryDate: string;
};

/**
 * Deletes many checklist cells in one path. Used by the grid range
 * selection Clear action.
 */
export async function bulkClearChecklistEntries(
  clientId: string,
  keys: BulkChecklistKey[],
): Promise<ActionState & { written?: number }> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return { error: "Nothing to clear." };
  }
  if (keys.length > MAX_BULK_CELLS) {
    return { error: `Too many cells (max ${MAX_BULK_CELLS}).` };
  }

  const normalized: BulkChecklistKey[] = [];
  for (const key of keys) {
    if (!key.objectiveId || !ENTRY_DATE_RE.test(key.entryDate)) {
      return { error: "Invalid cell date or objective." };
    }
    normalized.push({
      objectiveId: key.objectiveId,
      entryDate: entryDateOnly(key.entryDate),
    });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return { error: "Client not found." };
  }

  // Group by objective so .in(entry_date) cannot clear wrong objective days.
  const datesByObjective = new Map<string, string[]>();
  for (const key of normalized) {
    const list = datesByObjective.get(key.objectiveId) ?? [];
    list.push(key.entryDate);
    datesByObjective.set(key.objectiveId, list);
  }

  let deleted = 0;
  for (const [objectiveId, dates] of datesByObjective) {
    const uniqueDates = [...new Set(dates)];
    const { error, count } = await supabase
      .from("checklist_entries")
      .delete({ count: "exact" })
      .eq("client_id", clientId)
      .eq("objective_id", objectiveId)
      .in("entry_date", uniqueDates);

    if (error) {
      return { error: error.message };
    }
    deleted += count ?? 0;
  }

  revalidatePath(`/dashboard/checklists/${clientId}`);
  return { success: true, written: deleted };
}

function entryDateOnly(entryDate: string): string {
  // Supabase may return timestamps; normalize to YYYY-MM-DD for Set keys.
  return entryDate.slice(0, 10);
}

export type ChecklistImportPreview = {
  error?: string;
  monthHint?: string | null;
  matches?: {
    sheetLabel: string;
    objectiveTitle: string | null;
    matchedBy: "position" | "title" | null;
  }[];
  unmatchedLabels?: string[];
  invalid?: { sheetLabel: string; day: number; raw: string }[];
  newCount?: number;
  overwriteCount?: number;
  cells?: BulkChecklistCell[];
};

/**
 * Parses an uploaded export-layout .xlsx and returns a preview plus the
 * cells that would be written for the given month.
 */
export async function previewChecklistImport(
  formData: FormData,
): Promise<ChecklistImportPreview> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const month = String(formData.get("month") ?? "");
  const file = formData.get("file");

  if (!clientId) {
    return { error: "Missing client." };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { error: "Invalid month." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an Excel (.xlsx) file." };
  }
  if (!/\.xlsx$/i.test(file.name) && file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return { error: "File must be an .xlsx workbook." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return { error: "Client not found." };
  }

  const objectives = await getClientObjectives(supabase, clientId);
  if (objectives.length === 0) {
    return { error: "Add objectives before importing." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseChecklistImportXlsx(buffer, objectives, month);

  if (parsed.cells.length === 0 && parsed.unmatchedLabels.length === 0) {
    return {
      error: "No progress note data found. Use a file exported from this app.",
    };
  }

  const { start, end } = monthDateRange(month);
  const { data: existing, error: existingError } = await supabase
    .from("checklist_entries")
    .select("objective_id, entry_date")
    .eq("client_id", clientId)
    .gte("entry_date", start)
    .lte("entry_date", end);

  if (existingError) {
    return { error: existingError.message };
  }

  const taken = new Set(
    (existing ?? []).map(
      (row) => `${row.objective_id}:${entryDateOnly(row.entry_date)}`,
    ),
  );

  let newCount = 0;
  let overwriteCount = 0;
  for (const cell of parsed.cells) {
    if (taken.has(`${cell.objectiveId}:${cell.entryDate}`)) {
      overwriteCount += 1;
    } else {
      newCount += 1;
    }
  }

  return {
    monthHint: parsed.monthHint,
    matches: parsed.matches.map((match) => ({
      sheetLabel: match.sheetLabel,
      objectiveTitle: match.objectiveTitle,
      matchedBy: match.matchedBy,
    })),
    unmatchedLabels: parsed.unmatchedLabels,
    invalid: parsed.invalid,
    newCount,
    overwriteCount,
    cells: parsed.cells,
  };
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
  const description = String(formData.get("description") ?? "").trim();

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
    description: description || null,
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
 * Updates an objective's title and optional export description. Marks stay
 * attached to the same id.
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
  const description = String(formData.get("description") ?? "").trim();

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
    .update({ title, description: description || null })
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
