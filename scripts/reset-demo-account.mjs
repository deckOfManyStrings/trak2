// One-off script: deletes the shared demo account (admin + its 2 seeded
// staff members) so the next "Try the demo" click re-provisions a fresh
// baseline via ensureDemoAccount() in src/app/auth/actions.ts.
//
// Deleting each auth user cascades (via profiles.id -> auth.users(id) ON
// DELETE CASCADE, and every other table's owner_id -> profiles(id) ON
// DELETE CASCADE) through to remove all of that account's locations,
// clients, checklist entries, objectives, and annual reports too - nothing
// outside the demo account is touched.
//
// Usage: node --env-file=.env.local scripts/reset-demo-account.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run with: node --env-file=.env.local scripts/reset-demo-account.mjs",
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Staff first, admin last: deleting the admin cascades away the staff
// profiles too (owner_id -> profiles(id) cascade), which would make them
// impossible to look up afterward.
const DEMO_EMAILS = [
  "jordan.demo@traklify.com",
  "amara.demo@traklify.com",
  "demo@traklify.com",
];

for (const email of DEMO_EMAILS) {
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error(`Failed to look up ${email}:`, lookupError.message);
    continue;
  }

  if (!profile) {
    console.log(`No existing account for ${email} - nothing to delete.`);
    continue;
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(profile.id);

  if (deleteError) {
    console.error(`Failed to delete ${email}:`, deleteError.message);
  } else {
    console.log(`Deleted ${email} and all of its cascaded data.`);
  }
}

console.log('Done. The next "Try the demo" click will re-seed a fresh baseline account.');
