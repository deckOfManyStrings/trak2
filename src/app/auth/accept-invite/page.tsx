"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      // Supabase's invite email can land here either with PKCE-style
      // ?code=... (needs an explicit exchange) or with the older
      // #access_token=...&refresh_token=... hash. Read both from the URL
      // *before* doing anything else, since we're about to sign out (which
      // clears local storage) and, with detectSessionInUrl disabled on this
      // client, nothing else is going to pick these up for us.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      // This page's whole job is to switch the browser over to the
      // *invited* user's identity. Supabase sessions live in cookies that
      // are shared across every tab, so if you're still signed in as
      // whoever sent the invite (e.g. testing in the same browser), that
      // admin session would otherwise silently stick around and this page
      // would end up editing the admin's account instead of the invitee's.
      // Clear any existing local session first so there's no ambiguity
      // about which account the invite token below authenticates as.
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
      const metaFullName = data.user?.user_metadata?.full_name;
      setFullName(typeof metaFullName === "string" ? metaFullName : "");
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

    const { data: userResult, error: updateError } =
      await supabase.auth.updateUser({
        password,
        data: fullName ? { full_name: fullName } : undefined,
      });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    const userId = userResult.user?.id;
    if (userId) {
      await supabase
        .from("profiles")
        .update({ status: "active", full_name: fullName || null })
        .eq("id", userId);
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
          This invite link is invalid or expired
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ask your admin to send you a new invite.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-20">
      <div className="w-full max-w-[400px]">
        <h1 className="text-center text-[1.6rem] font-semibold tracking-tight text-foreground">
          Set up your account
        </h1>
        <p className="mt-2 text-center text-[0.925rem] text-muted-foreground">
          Choose a password to finish joining your team.
        </p>
        {email ? (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Signing in as <span className="font-medium">{email}</span>
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Jamie Lee"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
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
            {submitting ? "Setting up..." : "Continue"}
          </Button>
        </form>
      </div>
    </main>
  );
}
