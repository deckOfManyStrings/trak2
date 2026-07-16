// Free-plan usage caps, enforced in application code (not RLS) at the
// points where an admin creates a new location, client, or staff invite.
// Premium accounts have no limit. See
// supabase/migrations/0014_account_plan.sql.
export const FREE_PLAN_LIMITS = {
  locations: 1,
  clients: 2,
  staff: 2,
} as const;
