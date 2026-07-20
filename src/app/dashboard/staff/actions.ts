"use server";

import { parseStaffShiftTime } from "@/app/dashboard/staff/staff-options";
import { FREE_PLAN_LIMITS } from "@/lib/plan-limits";
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

function readStaffEmploymentFields(formData: FormData) {
  const shiftRaw = String(formData.get("shiftTime") ?? "").trim();
  const shiftTime = parseStaffShiftTime(shiftRaw);
  if (shiftRaw && !shiftTime) {
    return { error: "Choose a valid shift time." } as const;
  }

  const dateOfHire = String(formData.get("dateOfHire") ?? "").trim();

  return {
    full_name: String(formData.get("fullName") ?? "").trim() || null,
    position: String(formData.get("position") ?? "").trim() || null,
    shift_time: shiftTime,
    date_of_hire: dateOfHire || null,
  } as const;
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

  if (session.profile.plan === "free") {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "staff")
      .eq("owner_id", session.userId);

    if ((count ?? 0) >= FREE_PLAN_LIMITS.staff) {
      return {
        error: `Free plan is limited to ${FREE_PLAN_LIMITS.staff} staff members. Upgrade to add more.`,
      };
    }
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

/**
 * Updates a staff member's name and employment details. Admins only; target
 * must be staff owned by the current admin. Never accepts role, owner_id,
 * plan, or email.
 */
export async function updateStaffProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) {
    return { error: "Only admins can edit staff." };
  }

  const staffId = String(formData.get("staffId") ?? "");
  const employment = readStaffEmploymentFields(formData);
  if ("error" in employment) {
    return { error: employment.error };
  }

  if (!staffId) {
    return { error: "Missing staff id." };
  }
  if (!employment.full_name) {
    return { error: "Name is required." };
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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: employment.full_name,
      position: employment.position,
      shift_time: employment.shift_time,
      date_of_hire: employment.date_of_hire,
    })
    .eq("id", staffId)
    .eq("role", "staff")
    .eq("owner_id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/staff");
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
