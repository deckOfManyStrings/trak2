"use client";

import {
  updateMyProfile,
  type ActionState,
} from "@/app/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

const initialState: ActionState = {};

type ProfileFormProps = {
  email: string | null;
  fullName: string | null;
};

export function ProfileForm({ email, fullName }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateMyProfile,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email ?? ""}
          disabled
          readOnly
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-full-name">Full name</Label>
        <Input
          id="profile-full-name"
          name="fullName"
          defaultValue={fullName ?? ""}
          placeholder="Jamie Lee"
          required
        />
        <p className="text-xs text-muted-foreground">
          Used for progress note initials when you record entries.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground">Profile saved.</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
