"use client";

import {
  assignStaffToLocation,
  removeStaffFromLocation,
  revokeStaffAccess,
  updateStaffProfile,
  type ActionState,
} from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Location, Profile } from "@/types/db";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

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
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateStaffProfile,
    initialState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeStaffAccess,
    initialState,
  );
  const revokeFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (updateState.success) {
      setEditing(false);
    }
  }, [updateState]);

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

  if (editing) {
    return (
      <li className="rounded-lg border bg-white p-4">
        <form action={updateAction} className="space-y-3">
          <input type="hidden" name="staffId" value={staff.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${staff.id}`}>Full name</Label>
            <Input
              id={`edit-name-${staff.id}`}
              name="fullName"
              defaultValue={staff.full_name ?? ""}
              placeholder="Jamie Lee"
              required
            />
          </div>
          <p className="truncate text-sm text-muted-foreground">{staff.email}</p>
          {updateState.error ? (
            <p className="text-sm text-destructive">{updateState.error}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updatePending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
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

      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>

        <select
          value={currentLocationId ?? ""}
          disabled={isPending}
          onChange={(event) => handleLocationChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8 sm:w-auto sm:px-2.5 sm:text-sm dark:bg-input/30"
        >
          <option value="">Unassigned</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        <form ref={revokeFormRef} action={revokeAction} className="w-full sm:w-auto">
          <input type="hidden" name="staffId" value={staff.id} />
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
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
