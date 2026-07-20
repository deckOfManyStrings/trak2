"use client";

import { createClientRecord, type ActionState } from "@/app/dashboard/clients/actions";
import {
  EMERGENCY_CONTACT_RELATIONSHIPS,
  selectClassName,
} from "@/app/dashboard/clients/emergency-contact";
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
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-3">
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
            rows={2}
          />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <legend className="px-1 text-sm font-semibold">Emergency contact</legend>
        <div className="space-y-1.5">
          <Label htmlFor="client-ec-name">Name</Label>
          <Input
            id="client-ec-name"
            name="emergencyContactName"
            placeholder="Alex Rivera"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ec-relationship">Relationship to client</Label>
          <select
            id="client-ec-relationship"
            name="emergencyContactRelationship"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Select relationship</option>
            {EMERGENCY_CONTACT_RELATIONSHIPS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ec-phone">Phone</Label>
          <Input
            id="client-ec-phone"
            name="emergencyContactPhone"
            type="tel"
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ec-address">Address</Label>
          <Textarea
            id="client-ec-address"
            name="emergencyContactAddress"
            placeholder="123 Main St, City, ST 00000"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ec-email">Email address</Label>
          <Input
            id="client-ec-email"
            name="emergencyContactEmail"
            type="email"
            placeholder="alex@example.com"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <legend className="px-1 text-sm font-semibold">Service coordinator</legend>
        <div className="space-y-1.5">
          <Label htmlFor="client-sc-name">Name</Label>
          <Input
            id="client-sc-name"
            name="serviceCoordinatorName"
            placeholder="Jordan Lee"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-sc-phone">Phone</Label>
          <Input
            id="client-sc-phone"
            name="serviceCoordinatorPhone"
            type="tel"
            placeholder="(555) 555-5555"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-sc-email">Email</Label>
          <Input
            id="client-sc-email"
            name="serviceCoordinatorEmail"
            type="email"
            placeholder="coordinator@example.com"
          />
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="client-location">Location</Label>
        <select
          id="client-location"
          name="locationId"
          defaultValue={locations[0]?.id ?? ""}
          required
          className={selectClassName}
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
