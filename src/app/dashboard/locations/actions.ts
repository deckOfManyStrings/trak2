"use server";

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

export async function createLocation(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can create locations." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) {
    return { error: "Location name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("locations").insert({
    owner_id: session.userId,
    name,
    address: address || null,
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
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const programDescription = String(
    formData.get("programDescription") ?? "",
  ).trim();

  if (!id || !name) {
    return { error: "Location name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("locations")
    .update({
      name,
      address: address || null,
      program_description: programDescription || null,
    })
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
