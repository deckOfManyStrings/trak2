"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // Same PKCE-code-vs-hash-token handling as the accept-invite page:
      // read both possible formats from the URL before anything else, since
      // we're about to sign out (which clears local storage) and
      // detectSessionInUrl is disabled on this client.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // Clear any existing local session first (e.g. if you're already
      // signed in as someone else in this browser) so there's no ambiguity
      // about whose password is being reset.
      await supabase.auth.signOut({ scope: "local" });

      let sessionError: { message: string } | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        sessionError = error;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        sessionError = error;
      }

      window.history.replaceState({}, "", url.pathname);

      if (sessionError) {
        if (active) {
          setSessionValid(false);
          setChecking(false);
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setSessionValid(Boolean(data.user));
      setEmail(data.user?.email ?? null);
      setChecking(false);
    }

    init();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!sessionValid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          This reset link is invalid or expired
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Request a new one from the login page.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-20">
      <div className="w-full max-w-[400px]">
        <h1 className="text-center text-[1.6rem] font-semibold tracking-tight text-foreground">
          Choose a new password
        </h1>
        {email ? (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Resetting password for{" "}
            <span className="font-medium">{email}</span>
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              autoComplete="new-password"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-11 w-full rounded-md text-[0.925rem]"
          >
            {submitting ? "Saving..." : "Save new password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
