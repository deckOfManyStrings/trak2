"use client";

import { createLocation, type ActionState } from "@/app/dashboard/locations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useEffect, useRef } from "react";

const initialState: ActionState = {};

export function CreateLocationForm() {
  const [state, formAction, pending] = useActionState(
    createLocation,
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
        <Label htmlFor="location-name">Name</Label>
        <Input
          id="location-name"
          name="name"
          placeholder="Sunrise Day Center"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location-address">Address</Label>
        <Input
          id="location-address"
          name="address"
          placeholder="123 Main St, Springfield"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create location"}
      </Button>
    </form>
  );
}
