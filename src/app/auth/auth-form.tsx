"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

type AuthFormProps = {
  mode: "signin" | "signup";
  action: (formData: FormData) => void | Promise<void>;
  initialEmail?: string;
  initialStep?: "email" | "password";
};

export function AuthForm({
  mode,
  action,
  initialEmail = "",
  initialStep = "email",
}: AuthFormProps) {
  const [step, setStep] = useState<"email" | "password">(initialStep);
  const [email, setEmail] = useState(initialEmail);

  if (step === "email") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) setStep("password");
        }}
        className="space-y-3"
      >
        <Input
          type="email"
          name="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
          autoComplete="email"
          required
          className="h-11 rounded-md px-3.5 text-[0.925rem]"
        />
        <Button
          type="submit"
          size="lg"
          className="h-11 w-full rounded-md text-[0.925rem]"
        >
          Continue
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      <button
        type="button"
        onClick={() => setStep("email")}
        className="flex w-full items-center gap-2 rounded-md border border-input px-3.5 py-2.5 text-left text-[0.925rem] text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <ArrowLeft className="size-3.5 shrink-0" />
        <span className="truncate text-foreground">{email}</span>
      </button>
      <Input
        type="password"
        name="password"
        placeholder="Password"
        autoFocus
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={mode === "signup" ? 6 : undefined}
        required
        className="h-11 rounded-md px-3.5 text-[0.925rem]"
      />
      {mode === "signin" ? (
        <div className="text-right">
          <a
            href="#"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Forgot password?
          </a>
        </div>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md text-[0.925rem]"
      >
        {mode === "signup" ? "Create account" : "Continue"}
      </Button>
    </form>
  );
}
