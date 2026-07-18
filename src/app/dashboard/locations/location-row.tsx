"use client";

import {
  deleteLocation,
  updateLocation,
  type ActionState,
} from "@/app/dashboard/locations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
          <div className="space-y-1.5">
            <Label htmlFor={`program-description-${location.id}`}>
              Program description
            </Label>
            <Textarea
              id={`program-description-${location.id}`}
              name="programDescription"
              defaultValue={location.program_description ?? ""}
              placeholder="What this program does, for the Annual Assessment Report's Program Overview section"
              rows={3}
            />
          </div>
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
        <p className="font-medium text-foreground">{location.name}</p>
        {location.address ? (
          <p className="text-sm text-muted-foreground">{location.address}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {staffCount} staff &middot; {clientCount} clients
        </p>
        {location.program_description ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {location.program_description}
          </p>
        ) : null}
        {updateState.error ? (
          <p className="mt-1 text-xs text-destructive">{updateState.error}</p>
        ) : null}
        {deleteState.error ? (
          <p className="mt-1 text-xs text-destructive">{deleteState.error}</p>
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
