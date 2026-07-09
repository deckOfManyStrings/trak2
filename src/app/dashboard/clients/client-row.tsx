"use client";

import {
  deleteClientRecord,
  reassignClientLocation,
  setClientStatus,
  type ActionState,
} from "@/app/dashboard/clients/actions";
import { Button } from "@/components/ui/button";
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
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteClientRecord,
    initialState,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);

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
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        {deleteState.error ? (
          <p className="mt-1 text-xs text-destructive">{deleteState.error}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
