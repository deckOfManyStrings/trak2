"use client";

import {
  deleteLocation,
  updateLocation,
  type ActionState,
} from "@/app/dashboard/locations/actions";
import {
  LocationFields,
  LocationSummary,
} from "@/app/dashboard/locations/location-fields";
import { Button } from "@/components/ui/button";
import type { Location } from "@/types/db";
import { useActionState, useRef, useState } from "react";

const initialState: ActionState = {};

type LocationRowProps = {
  location: Location;
  staffCount: number;
  clientCount: number;
};

export function LocationRow({
  location,
  staffCount,
  clientCount,
}: LocationRowProps) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateLocation,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLocation,
    initialState,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);

  if (editing) {
    return (
      <li className="rounded-lg border bg-white p-4">
        <form
          action={(formData) => {
            updateAction(formData);
            setEditing(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={location.id} />
          <LocationFields location={location} idPrefix={`edit-${location.id}`} />
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
      <div className="min-w-0 space-y-1">
        <LocationSummary location={location} />
        <p className="text-xs text-muted-foreground">
          {staffCount} staff &middot; {clientCount} clients
        </p>
        {updateState.error ? (
          <p className="text-xs text-destructive">{updateState.error}</p>
        ) : null}
        {deleteState.error ? (
          <p className="text-xs text-destructive">{deleteState.error}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <form ref={deleteFormRef} action={deleteAction} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={location.id} />
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={deletePending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${location.name}"? This can't be undone.`,
                )
              ) {
                deleteFormRef.current?.requestSubmit();
              }
            }}
          >
            Delete
          </Button>
        </form>
      </div>
    </li>
  );
}
