"use client";

import { toggleAccountPlan, type ActionState } from "@/app/internal/accounts/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/db";
import { useActionState } from "react";

const initialState: ActionState = {};

type AccountRowProps = {
  profile: Profile;
  locationCount: number;
  clientCount: number;
};

export function AccountRow({
  profile,
  locationCount,
  clientCount,
}: AccountRowProps) {
  const [state, formAction, pending] = useActionState(
    toggleAccountPlan,
    initialState,
  );

  const nextPlan = profile.plan === "free" ? "premium" : "free";

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {profile.full_name || profile.email}
        </p>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locationCount} location{locationCount === 1 ? "" : "s"} &middot;{" "}
          {clientCount} client{clientCount === 1 ? "" : "s"} &middot; plan:{" "}
          <span className="font-medium text-foreground">{profile.plan}</span>
        </p>
        {state.error ? (
          <p className="mt-1 text-xs text-destructive">{state.error}</p>
        ) : null}
      </div>

      <form action={formAction}>
        <input type="hidden" name="profileId" value={profile.id} />
        <input type="hidden" name="plan" value={nextPlan} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending
            ? "Updating..."
            : nextPlan === "premium"
              ? "Upgrade to premium"
              : "Downgrade to free"}
        </Button>
      </form>
    </li>
  );
}
