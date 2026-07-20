"use client";

import { createLocation, type ActionState } from "@/app/dashboard/locations/actions";
import { LocationFields } from "@/app/dashboard/locations/location-fields";
import { Button } from "@/components/ui/button";
import { useActionState, useEffect, useRef, useState } from "react";

const initialState: ActionState = {};

export function CreateLocationForm() {
  const [state, formAction, pending] = useActionState(
    createLocation,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [fieldsKey, setFieldsKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setFieldsKey((key) => key + 1);
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <LocationFields fieldsKey={fieldsKey} idPrefix="create-location" />
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating..." : "Create location"}
      </Button>
    </form>
  );
}
