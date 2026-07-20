"use client";

import { inviteStaff, type ActionState } from "@/app/dashboard/staff/actions";
import { staffSelectClassName } from "@/app/dashboard/staff/staff-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Location } from "@/types/db";
import { useActionState, useEffect, useRef } from "react";

const initialState: ActionState = {};

export function InviteStaffForm({ locations }: { locations: Location[] }) {
  const [state, formAction, pending] = useActionState(
    inviteStaff,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          placeholder="staff@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-full-name">Name (optional)</Label>
        <Input id="invite-full-name" name="fullName" placeholder="Jamie Lee" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-location">Assign to location (optional)</Label>
        <select
          id="invite-location"
          name="locationId"
          defaultValue=""
          className={staffSelectClassName}
        >
          <option value="">Assign later</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground">Invite sent.</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending invite..." : "Send invite"}
      </Button>
    </form>
  );
}
