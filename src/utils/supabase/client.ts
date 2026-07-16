import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// detectSessionInUrl is disabled because the one page that uses this client
// (accept-invite) needs to sign out any existing local session *before*
// establishing the invited user's session, and it does so deterministically
// by parsing the URL itself. Leaving auto-detection on races that page's own
// signOut() against the SDK's independent auto-detection of the same URL,
// which can silently wipe out the invited user's just-established session.
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    auth: { detectSessionInUrl: false },
  });
