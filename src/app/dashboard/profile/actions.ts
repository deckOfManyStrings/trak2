"use server";

import { createClient } from "@/utils/supabase/server";
import { getSessionProfile } from "@/utils/supabase/session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Updates the signed-in user's own full_name only. Never accepts role,
 * owner_id, plan, or email from the client.
 */
export async function updateMyProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session) {
    return { error: "You must be signed in." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) {
    return { error: "Full name is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", session.userId);

  if (error) {
    return { error: error.message };
  }

  await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true };
}
