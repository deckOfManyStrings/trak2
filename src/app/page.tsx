import { signIn, signInAsDemo, signUp } from "@/app/auth/actions";
import { AuthForm } from "@/app/auth/auth-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    mode?: string;
    email?: string;
  }>;
};

function LogoMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-base font-semibold text-background">
      T
    </span>
  );
}

export default async function Page({ searchParams }: PageProps) {
  const [{ error, message, mode: modeParam, email: emailParam }, cookieStore] =
    await Promise.all([searchParams, cookies()]);
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mode = modeParam === "signup" ? "signup" : "signin";
  const statusMessage = error ?? message;
  const initialEmail = emailParam ?? "";
  const initialStep = error && initialEmail ? "password" : "email";

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-20">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex justify-center">
          <LogoMark />
        </div>

        <h1 className="text-center text-[1.6rem] font-semibold tracking-tight text-foreground">
          {mode === "signup" ? "Create an account" : "Log in to Trak"}
        </h1>
        <p className="mt-2 text-center text-[0.925rem] text-muted-foreground">
          {mode === "signup"
            ? "Set up your account to get started."
            : "Welcome back. Please log in to continue."}
        </p>

        {statusMessage ? (
          <p
            className={`mt-5 text-center text-sm ${
              error ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-7">
          <AuthForm
            key={`${mode}-${initialStep}-${initialEmail}`}
            mode={mode}
            action={mode === "signup" ? signUp : signIn}
            initialEmail={initialEmail}
            initialStep={initialStep}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={signInAsDemo} className="mt-5">
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-md text-[0.925rem]"
          >
            Try the demo
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Explore a pre-loaded account with sample staff and clients. No
          sign-up required.
        </p>

        <p className="mt-6 text-center text-[0.925rem] text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link
                href="/?mode=signin"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Trak?{" "}
              <Link
                href="/?mode=signup"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>

      <p className="mt-16 max-w-[400px] text-center text-xs text-muted-foreground">
        By continuing, you acknowledge that you have read and agree to
        Trak&apos;s{" "}
        <Link href="#" className="underline underline-offset-4 hover:text-foreground">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
