"use server";

import { createAdminClient } from "@/utils/supabase/admin";
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

export async function inviteStaff(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can invite staff." };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "");

  if (!email) {
    return { error: "Email is required." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Staff invites aren't configured yet. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: "staff",
      invited_by: session.userId,
      full_name: fullName || null,
    },
    redirectTo: `${siteUrl}/auth/accept-invite`,
  });

  if (error) {
    return { error: error.message };
  }

  if (locationId && data.user) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error: linkError } = await supabase
      .from("staff_locations")
      .insert({ staff_id: data.user.id, location_id: locationId });

    if (linkError) {
      return {
        error: `Invite sent, but assigning the location failed: ${linkError.message}`,
      };
    }
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Moves a staff member to a new location, replacing any existing
 * assignment so a staff member has exactly one active location. Called
 * directly (not via a <form>) from both the staff list and the
 * drag-and-drop board.
 */
export async function assignStaffToLocation(
  staffId: string,
  locationId: string,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can reassign staff." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: deleteError } = await supabase
    .from("staff_locations")
    .delete()
    .eq("staff_id", staffId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("staff_locations")
    .insert({ staff_id: staffId, location_id: locationId });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeStaffFromLocation(
  staffId: string,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can unassign staff." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("staff_locations")
    .delete()
    .eq("staff_id", staffId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function revokeStaffAccess(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can remove staff." };
  }

  const staffId = String(formData.get("staffId") ?? "");
  if (!staffId) {
    return { error: "Missing staff id." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("id, owner_id, role")
    .eq("id", staffId)
    .single();

  if (
    !staffProfile ||
    staffProfile.role !== "staff" ||
    staffProfile.owner_id !== session.userId
  ) {
    return { error: "Staff member not found." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Staff management isn't fully configured yet. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(staffId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard");
  return { success: true };
}
