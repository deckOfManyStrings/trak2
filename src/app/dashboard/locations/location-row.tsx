"use client";

import {
  deleteLocation,
  updateLocation,
  type ActionState,
} from "@/app/dashboard/locations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          className="space-y-3"
        >
          <input type="hidden" name="id" value={location.id} />
          <Input
            name="name"
            defaultValue={location.name}
            placeholder="Location name"
            required
          />
          <Input
            name="address"
            defaultValue={location.address ?? ""}
            placeholder="Address"
          />
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
    <li className="flex items-center justify-between rounded-lg border bg-white p-4">
      <div>
        <p className="font-medium text-foreground">{location.name}</p>
        {location.address ? (
          <p className="text-sm text-muted-foreground">{location.address}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {staffCount} staff &middot; {clientCount} clients
        </p>
        {updateState.error ? (
          <p className="mt-1 text-xs text-destructive">{updateState.error}</p>
        ) : null}
        {deleteState.error ? (
          <p className="mt-1 text-xs text-destructive">{deleteState.error}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <form ref={deleteFormRef} action={deleteAction}>
          <input type="hidden" name="id" value={location.id} />
          <Button
            type="button"
            size="sm"
            variant="destructive"
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
