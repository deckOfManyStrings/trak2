"use client";

import {
  assignStaffToLocation,
  removeStaffFromLocation,
  revokeStaffAccess,
  type ActionState,
} from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import type { Location, Profile } from "@/types/db";
import { useActionState, useRef, useState, useTransition } from "react";

const initialState: ActionState = {};

const STATUS_LABEL: Record<Profile["status"], string> = {
  invited: "Invited",
  active: "Active",
  inactive: "Inactive",
};

type StaffRowProps = {
  staff: Profile;
  currentLocationId: string | null;
  locations: Location[];
};

export function StaffRow({ staff, currentLocationId, locations }: StaffRowProps) {
  const [isPending, startTransition] = useTransition();
  const [assignError, setAssignError] = useState<string | null>(null);
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeStaffAccess,
    initialState,
  );
  const revokeFormRef = useRef<HTMLFormElement>(null);

  const handleLocationChange = (value: string) => {
    setAssignError(null);
    startTransition(async () => {
      const result = value
        ? await assignStaffToLocation(staff.id, value)
        : await removeStaffFromLocation(staff.id);

      if (result.error) {
        setAssignError(result.error);
      }
    });
  };

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {staff.full_name || staff.email}
        </p>
        <p className="truncate text-sm text-muted-foreground">{staff.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {STATUS_LABEL[staff.status]}
        </p>
        {assignError ? (
          <p className="mt-1 text-xs text-destructive">{assignError}</p>
        ) : null}
        {revokeState.error ? (
          <p className="mt-1 text-xs text-destructive">{revokeState.error}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <select
          value={currentLocationId ?? ""}
          disabled={isPending}
          onChange={(event) => handleLocationChange(event.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Unassigned</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        <form ref={revokeFormRef} action={revokeAction}>
          <input type="hidden" name="staffId" value={staff.id} />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={revokePending}
            onClick={() => {
              if (
                window.confirm(
                  `Remove ${staff.full_name || staff.email}? They will lose access immediately.`,
                )
              ) {
                revokeFormRef.current?.requestSubmit();
              }
            }}
          >
            Remove
          </Button>
        </form>
      </div>
    </li>
  );
}
