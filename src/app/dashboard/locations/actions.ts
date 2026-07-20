"use server";

import {
  parseLocationServiceType,
  parseRegionalCenter,
} from "@/app/dashboard/locations/location-options";
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

function readLocationFields(formData: FormData) {
  const serviceTypeRaw = String(formData.get("serviceType") ?? "").trim();
  const serviceType = parseLocationServiceType(serviceTypeRaw);
  if (serviceTypeRaw && !serviceType) {
    return { error: "Choose a valid service type." } as const;
  }

  const regionalCenterRaw = String(formData.get("regionalCenter") ?? "").trim();
  const regionalCenter = parseRegionalCenter(regionalCenterRaw);
  if (regionalCenterRaw && !regionalCenter) {
    return { error: "Choose a valid regional center." } as const;
  }

  return {
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contactName") ?? "").trim() || null,
    contact_phone: String(formData.get("contactPhone") ?? "").trim() || null,
    service_type: serviceType,
    address: String(formData.get("address") ?? "").trim() || null,
    vendor_name: String(formData.get("vendorName") ?? "").trim() || null,
    vendor_number: String(formData.get("vendorNumber") ?? "").trim() || null,
    regional_center: regionalCenter,
    vendor_address: String(formData.get("vendorAddress") ?? "").trim() || null,
    business_address:
      String(formData.get("businessAddress") ?? "").trim() || null,
    program_description:
      String(formData.get("programDescription") ?? "").trim() || null,
  } as const;
}

export async function createLocation(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can create locations." };
  }

  const fields = readLocationFields(formData);
  if ("error" in fields) {
    return { error: fields.error };
  }

  if (!fields.name) {
    return { error: "Location name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (session.profile.plan === "free") {
    const { count } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", session.userId);

    if ((count ?? 0) >= FREE_PLAN_LIMITS.locations) {
      return {
        error: `Free plan is limited to ${FREE_PLAN_LIMITS.locations} location. Upgrade to add more.`,
      };
    }
  }

  const { error } = await supabase.from("locations").insert({
    owner_id: session.userId,
    ...fields,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/board");
  return { success: true };
}

export async function updateLocation(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can edit locations." };
  }

  const id = String(formData.get("id") ?? "");
  const fields = readLocationFields(formData);
  if ("error" in fields) {
    return { error: fields.error };
  }

  if (!id || !fields.name) {
    return { error: "Location name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("locations")
    .update(fields)
    .eq("id", id)
    .eq("owner_id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/board");
  return { success: true };
}

export async function deleteLocation(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can delete locations." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { error: "Missing location id." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", id)
    .eq("owner_id", session.userId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "This location still has clients assigned to it. Move or remove them first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/locations");
  revalidatePath("/dashboard/board");
  return { success: true };
}
