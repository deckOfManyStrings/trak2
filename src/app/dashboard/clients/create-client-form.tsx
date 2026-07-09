"use client";

import { createClientRecord, type ActionState } from "@/app/dashboard/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Location } from "@/types/db";
import { useActionState, useEffect, useRef } from "react";

const initialState: ActionState = {};

export function CreateClientForm({ locations }: { locations: Location[] }) {
  const [state, formAction, pending] = useActionState(
    createClientRecord,
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
        <Label htmlFor="client-name">Full name</Label>
        <Input id="client-name" name="fullName" placeholder="Pat Rivera" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-location">Location</Label>
        <select
          id="client-location"
          name="locationId"
          defaultValue={locations[0]?.id ?? ""}
          required
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
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
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Adding..." : "Add client"}
      </Button>
    </form>
  );
}
