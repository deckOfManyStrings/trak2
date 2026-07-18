"use client";

import { createClientRecord, type ActionState } from "@/app/dashboard/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        <Label htmlFor="client-ucid">UCID</Label>
        <Input id="client-ucid" name="ucid" placeholder="Unique client ID" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-allergies">Allergies</Label>
        <Textarea
          id="client-allergies"
          name="allergies"
          placeholder="Known allergies"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-sc-name">Service coordinator name</Label>
        <Input
          id="client-sc-name"
          name="serviceCoordinatorName"
          placeholder="Jordan Lee"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-sc-phone">Service coordinator phone</Label>
        <Input
          id="client-sc-phone"
          name="serviceCoordinatorPhone"
          type="tel"
          placeholder="(555) 555-5555"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-sc-email">Service coordinator email</Label>
        <Input
          id="client-sc-email"
          name="serviceCoordinatorEmail"
          type="email"
          placeholder="coordinator@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-location">Location</Label>
        <select
          id="client-location"
          name="locationId"
          defaultValue={locations[0]?.id ?? ""}
          required
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:px-2.5 md:text-sm dark:bg-input/30"
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
