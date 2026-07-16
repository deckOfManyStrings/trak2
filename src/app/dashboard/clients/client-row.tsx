"use client";

import {
  deleteClientRecord,
  reassignClientLocation,
  setClientStatus,
  updateClientRecord,
  type ActionState,
} from "@/app/dashboard/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client, Location } from "@/types/db";
import { useActionState, useRef, useState, useTransition } from "react";

const initialState: ActionState = {};

type ClientRowProps = {
  client: Client;
  location: Location | null;
  locations: Location[];
  canReassign: boolean;
  canDelete: boolean;
};

export function ClientRow({
  client,
  location,
  locations,
  canReassign,
  canDelete,
}: ClientRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateClientRecord,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClientRecord,
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
          <input type="hidden" name="clientId" value={client.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${client.id}`}>Full name</Label>
            <Input
              id={`edit-name-${client.id}`}
              name="fullName"
              defaultValue={client.full_name}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-dob-${client.id}`}>Date of birth</Label>
              <Input
                id={`edit-dob-${client.id}`}
                name="dateOfBirth"
                type="date"
                defaultValue={client.date_of_birth ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-admission-${client.id}`}>
                Date of admission
              </Label>
              <Input
                id={`edit-admission-${client.id}`}
                name="dateOfAdmission"
                type="date"
                defaultValue={client.date_of_admission ?? ""}
              />
            </div>
          </div>
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

  const toggleStatus = () => {
    setError(null);
    const nextStatus = client.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await setClientStatus(client.id, nextStatus);
      if (result.error) setError(result.error);
    });
  };

  const handleLocationChange = (locationId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await reassignClientLocation(client.id, locationId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">
          {client.full_name}
        </p>
        <p className="text-sm text-muted-foreground">
          {location?.name ?? "Unassigned"}
          {client.status === "inactive" ? " \u00b7 Inactive" : ""}
        </p>
        {client.date_of_birth || client.date_of_admission ? (
          <p className="text-xs text-muted-foreground">
            {client.date_of_birth ? `DOB ${client.date_of_birth}` : null}
            {client.date_of_birth && client.date_of_admission ? " \u00b7 " : null}
            {client.date_of_admission
              ? `Admitted ${client.date_of_admission}`
              : null}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        {updateState.error ? (
          <p className="mt-1 text-xs text-destructive">{updateState.error}</p>
        ) : null}
        {deleteState.error ? (
          <p className="mt-1 text-xs text-destructive">{deleteState.error}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>

        {canReassign ? (
          <select
            value={client.location_id}
            disabled={isPending}
            onChange={(event) => handleLocationChange(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={toggleStatus}
        >
          {client.status === "active" ? "Mark inactive" : "Mark active"}
        </Button>

        {canDelete ? (
          <form ref={deleteFormRef} action={deleteAction}>
            <input type="hidden" name="clientId" value={client.id} />
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deletePending}
              onClick={() => {
                if (
                  window.confirm(`Remove ${client.full_name}? This can't be undone.`)
                ) {
                  deleteFormRef.current?.requestSubmit();
                }
              }}
            >
              Remove
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
