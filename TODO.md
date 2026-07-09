# TODO

## Email delivery (Resend SMTP)

### 1. Verify a real sending domain in Resend

Custom SMTP is configured (`smtp.resend.com` in Supabase's Auth SMTP
settings), but the sender email is currently a personal address on a domain
we don't own/control in Resend. Resend rejects sends from unverified
domains, so **all auth emails (signups, invites, password resets) currently
fail** with `Error sending confirmation email` (500 `unexpected_failure`
from `/auth/v1/signup`).

- [ ] Buy/pick a domain (any registrar).
- [ ] Add it to Resend and add the SPF/DKIM DNS records it provides.
- [ ] Wait for the domain to show **Verified** in Resend.
- [ ] Update Supabase Dashboard -> Authentication -> Emails -> SMTP Settings
      -> **Sender email** to an address on that verified domain (e.g.
      `no-reply@yourdomain.com`).
- [ ] Re-test with a real signup/invite and confirm the email is delivered
      (check Resend's dashboard logs + the actual inbox).

Temporary/local-only unblock if needed before a domain is ready: set the
Supabase SMTP **Sender email** to `onboarding@resend.dev` (Resend's sandbox
sender). Note this only delivers to the email address on the Resend account
itself, so it can't be used for real staff invites to other people.

### 2. Fix raw `{}` shown as the error message on the login/signup page

When `supabase.auth.signUp()` (or `signIn`) returns certain error shapes,
`error.message` ends up rendering as a literal `{}` in the UI instead of a
readable message (seen after the SMTP send failure, and previously after
hitting the email rate limit). Root-cause how `error.message` is being
derived/stringified in `src/app/auth/actions.ts` (`redirectWithMessage`)
and/or how `AuthForm` displays `statusMessage` in `src/app/page.tsx`, and
show the real underlying message (or a sensible fallback) instead.

- [ ] Reproduce with a forced `signUp` failure (e.g. temporarily break SMTP
      again, or simulate) and inspect the actual `error` object shape.
- [ ] Fix the message extraction/serialization so a readable string always
      reaches `redirectWithMessage`.
- [ ] Add a sensible fallback string (e.g. "Something went wrong, please
      try again.") for any error shape that has no usable message, so users
      never see raw JSON.
