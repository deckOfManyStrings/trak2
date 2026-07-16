"use server";

import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

async function requireAdmin() {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return null;
  }
  return session;
}

export async function createClientRecord(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can add clients." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "");

  if (!fullName) {
    return { error: "Client name is required." };
  }
  if (!locationId) {
    return { error: "Choose a location for this client." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (session.profile.plan === "free") {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", session.userId);

    if ((count ?? 0) >= FREE_PLAN_LIMITS.clients) {
      return {
        error: `Free plan is limited to ${FREE_PLAN_LIMITS.clients} clients. Upgrade to add more.`,
      };
    }
  }

  const { error } = await supabase.from("clients").insert({
    owner_id: session.userId,
    location_id: locationId,
    full_name: fullName,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Updates a client's demographic fields (name, DOB, admission date). These
 * feed the Annual Assessment Report header, so both admins and staff
 * assigned to the client's location may edit them - enforced by the clients
 * RLS update policy, same as setClientStatus below.
 */
export async function updateClientRecord(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const dateOfAdmission = String(formData.get("dateOfAdmission") ?? "").trim();

  if (!clientId || !fullName) {
    return { error: "Client name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("clients")
    .update({
      full_name: fullName,
      date_of_birth: dateOfBirth || null,
      date_of_admission: dateOfAdmission || null,
    })
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/board");
  return { success: true };
}

/**
 * Toggles a client's active/inactive status. Both admins and staff assigned
 * to the client's location may call this - enforced by the clients RLS
 * update policy, so no extra role check is needed here beyond auth.
 */
export async function setClientStatus(
  clientId: string,
  status: "active" | "inactive",
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/board");
  return { success: true };
}

/**
 * Moves a client to a different location. Admin-only, called directly
 * (not via a <form>) from both the clients list and the drag-and-drop board.
 */
export async function reassignClientLocation(
  clientId: string,
  locationId: string,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can move clients between locations." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("clients")
    .update({ location_id: locationId })
    .eq("id", clientId)
    .eq("owner_id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/board");
  return { success: true };
}

export async function deleteClientRecord(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can remove clients." };
  }

  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) {
    return { error: "Missing client id." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("owner_id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}
