"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function redirectWithMessage(
  type: "error" | "message",
  message: string,
  extra?: Record<string, string>,
) {
  const params = new URLSearchParams({ [type]: message, ...extra });
  redirect(`/?${params.toString()}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectWithMessage("error", "Email and password are required.", {
      email,
    });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage("error", error.message, { email });
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectWithMessage("error", "Email and password are required.", {
      email,
      mode: "signup",
    });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // No role metadata is passed here, so the handle_new_user trigger
  // defaults this account to role = 'admin' (self-serve signups always
  // become admins; staff only ever get created via an admin's invite).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirectWithMessage("error", error.message, { email, mode: "signup" });
  }

  if (data.session) {
    redirect("/dashboard");
  }

  redirectWithMessage(
    "message",
    "Check your email to confirm your account before signing in.",
  );
}

export async function signOut() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Sends a password-reset email. Always redirects with the same generic
 * confirmation message regardless of whether the address exists, so this
 * can't be used to probe which emails have accounts.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirectWithMessage("error", "Enter your email address.", {
      mode: "forgot",
    });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  });

  redirectWithMessage(
    "message",
    "If an account exists for that email, a password reset link is on its way.",
  );
}

const DEMO_ADMIN_EMAIL = "demo@traklify.com";
const DEMO_ADMIN_PASSWORD =
  process.env.DEMO_USER_PASSWORD ?? "TraklifyDemo!2026";

// Seeds one location + one staff member + a couple of clients per entry, so
// the demo account has something to look at on every page (locations,
// staff, board, clients) right after signing in.
const DEMO_LOCATIONS = [
  {
    name: "Sunrise Center",
    staffEmail: "jordan.demo@traklify.com",
    staffName: "Jordan Rivera",
    clients: ["Eleanor Whitfield", "Marcus Bell"],
  },
  {
    name: "Maple Street Location",
    staffEmail: "amara.demo@traklify.com",
    staffName: "Amara Chen",
    clients: ["Grace Thompson", "Walter Nguyen"],
  },
] as const;

/**
 * Signs the caller into a shared, seeded demo account instead of requiring
 * a real sign-up. The demo admin owns two locations, each staffed by one
 * (already-active) staff member with a couple of sample clients, so new
 * features can be tried out immediately.
 *
 * The first call provisions that account; every later call just signs back
 * into the same one, since it's looked up by email before anything is
 * created.
 */
export async function signInAsDemo() {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirectWithMessage(
      "error",
      "Demo mode isn't configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment variables.",
    );
    return;
  }

  const setupError = await ensureDemoAccount(admin);
  if (setupError) {
    redirectWithMessage("error", `Couldn't start the demo: ${setupError}`);
    return;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
  });

  if (error) {
    redirectWithMessage("error", `Couldn't start the demo: ${error.message}`);
    return;
  }

  redirect("/dashboard");
}

async function ensureDemoAccount(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", DEMO_ADMIN_EMAIL)
    .eq("role", "admin")
    .maybeSingle();

  if (existing) return null;

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo Admin" },
    });

  if (createError || !created.user) {
    return createError?.message ?? "Failed to create the demo admin.";
  }

  const demoAdminId = created.user.id;

  for (const entry of DEMO_LOCATIONS) {
    const { data: location, error: locationError } = await admin
      .from("locations")
      .insert({ owner_id: demoAdminId, name: entry.name })
      .select("id")
      .single();

    if (locationError || !location) {
      return locationError?.message ?? "Failed to create a demo location.";
    }

    const { data: staffUser, error: staffError } =
      await admin.auth.admin.createUser({
        email: entry.staffEmail,
        password: randomUUID(),
        email_confirm: true,
        user_metadata: {
          role: "staff",
          invited_by: demoAdminId,
          full_name: entry.staffName,
        },
      });

    if (staffError || !staffUser.user) {
      return staffError?.message ?? "Failed to create a demo staff member.";
    }

    const staffId = staffUser.user.id;

    // handle_new_user() marks new staff as "invited" until they set a
    // password via the accept-invite flow; the demo account should look
    // fully active from the start, so flip that immediately.
    const [{ error: activateError }, { error: linkError }] =
      await Promise.all([
        admin.from("profiles").update({ status: "active" }).eq("id", staffId),
        admin
          .from("staff_locations")
          .insert({ staff_id: staffId, location_id: location.id }),
      ]);

    if (activateError || linkError) {
      return (
        activateError?.message ??
        linkError?.message ??
        "Failed to finish setting up a demo staff member."
      );
    }

    const { error: clientsError } = await admin.from("clients").insert(
      entry.clients.map((fullName) => ({
        owner_id: demoAdminId,
        location_id: location.id,
        full_name: fullName,
      })),
    );

    if (clientsError) {
      return clientsError.message;
    }
  }

  return null;
}
