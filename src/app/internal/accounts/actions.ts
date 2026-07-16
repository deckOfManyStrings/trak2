"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSessionProfile } from "@/utils/supabase/session";
import { isSuperAdminEmail } from "@/lib/super-admin";
import type { AccountPlan } from "@/types/db";
import { revalidatePath } from "next/cache";

export type ActionState = {
  error?: string;
  success?: boolean;
};

/**
 * Flips one admin account's plan. Gated entirely by the SUPER_ADMIN_EMAILS
 * allowlist re-checked here server-side - never trust the client, even
 * though the page that links here is itself already gated.
 */
export async function toggleAccountPlan(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionProfile();
  if (!session || !isSuperAdminEmail(session.email)) {
    return { error: "Not authorized." };
  }

  const profileId = String(formData.get("profileId") ?? "");
  const plan = String(formData.get("plan") ?? "") as AccountPlan;

  if (!profileId || (plan !== "free" && plan !== "premium")) {
    return { error: "Missing or invalid plan change." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ plan })
    .eq("id", profileId)
    .eq("role", "admin");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/internal/accounts");
  return { success: true };
}
