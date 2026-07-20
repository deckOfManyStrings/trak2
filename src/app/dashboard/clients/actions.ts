"use server";

import {
  parseEmergencyContactRelationship,
} from "@/app/dashboard/clients/emergency-contact";
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

function readEmergencyContactFields(formData: FormData) {
  const relationshipRaw = String(
    formData.get("emergencyContactRelationship") ?? "",
  ).trim();
  const relationship = parseEmergencyContactRelationship(relationshipRaw);

  if (relationshipRaw && !relationship) {
    return { error: "Choose a valid emergency contact relationship." } as const;
  }

  return {
    emergency_contact_name:
      String(formData.get("emergencyContactName") ?? "").trim() || null,
    emergency_contact_relationship: relationship,
    emergency_contact_phone:
      String(formData.get("emergencyContactPhone") ?? "").trim() || null,
    emergency_contact_address:
      String(formData.get("emergencyContactAddress") ?? "").trim() || null,
    emergency_contact_email:
      String(formData.get("emergencyContactEmail") ?? "").trim() || null,
  } as const;
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
  const ucid = String(formData.get("ucid") ?? "").trim();
  const allergies = String(formData.get("allergies") ?? "").trim();
  const emergencyContact = readEmergencyContactFields(formData);
  if ("error" in emergencyContact) {
    return { error: emergencyContact.error };
  }
  const serviceCoordinatorName = String(
    formData.get("serviceCoordinatorName") ?? "",
  ).trim();
  const serviceCoordinatorPhone = String(
    formData.get("serviceCoordinatorPhone") ?? "",
  ).trim();
  const serviceCoordinatorEmail = String(
    formData.get("serviceCoordinatorEmail") ?? "",
  ).trim();

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
    ucid: ucid || null,
    allergies: allergies || null,
    ...emergencyContact,
    service_coordinator_name: serviceCoordinatorName || null,
    service_coordinator_phone: serviceCoordinatorPhone || null,
    service_coordinator_email: serviceCoordinatorEmail || null,
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
 * Updates a client's profile fields (name, DOB, admission date, UCID,
 * allergies, emergency contact, service coordinator). Both admins and staff
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
  const ucid = String(formData.get("ucid") ?? "").trim();
  const allergies = String(formData.get("allergies") ?? "").trim();
  const emergencyContact = readEmergencyContactFields(formData);
  if ("error" in emergencyContact) {
    return { error: emergencyContact.error };
  }
  const serviceCoordinatorName = String(
    formData.get("serviceCoordinatorName") ?? "",
  ).trim();
  const serviceCoordinatorPhone = String(
    formData.get("serviceCoordinatorPhone") ?? "",
  ).trim();
  const serviceCoordinatorEmail = String(
    formData.get("serviceCoordinatorEmail") ?? "",
  ).trim();

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
      ucid: ucid || null,
      allergies: allergies || null,
      ...emergencyContact,
      service_coordinator_name: serviceCoordinatorName || null,
      service_coordinator_phone: serviceCoordinatorPhone || null,
      service_coordinator_email: serviceCoordinatorEmail || null,
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
