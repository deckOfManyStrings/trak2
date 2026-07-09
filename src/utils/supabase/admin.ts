import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Privileged Supabase client authenticated with the service role key.
 * Bypasses Row Level Security entirely, so it must only ever be used from
 * server-only code (server actions / route handlers) after the caller's
 * own role has already been verified with the regular session-bound client.
 *
 * Never import this from a Client Component - the `server-only` import
 * above will fail the build if that happens.
 */
export const createAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "The service role key must be set in .env.local and never exposed " +
        "with a NEXT_PUBLIC_ prefix.",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
