# TODO

## Email delivery (Resend SMTP)

### 1. Verify traklify.com as a sending domain in Resend

Custom SMTP is configured (`smtp.resend.com` in Supabase's Auth SMTP
settings), but the sender email is currently a personal address on a domain
we don't own/control in Resend. Resend rejects sends from unverified
domains, so **all auth emails (signups, invites, password resets) currently
fail** with `Error sending confirmation email` (500 `unexpected_failure`
from `/auth/v1/signup`).

We now own `traklify.com` and will send as `support@traklify.com`.

- [x] Buy/pick a domain - using `traklify.com`.
- [x] Sign up for Resend (resend.com).
- [x] In Resend -> Domains -> Add Domain, add `traklify.com`.
- [x] Add the DNS records Resend gives you (typically an MX + TXT/SPF record
      on a `send.` subdomain, plus a DKIM TXT record, and optionally DMARC)
      wherever `traklify.com`'s DNS is managed. These are separate record
      types from the MX record already routing mail to the real
      `support@traklify.com` mailbox, so they won't conflict with it.
- [x] Wait for the domain to show **Verified** in Resend (can take a few
      minutes up to a few hours for DNS to propagate).
- [ ] In Resend -> API Keys, create a key and put it in `.env.local` as
      `RESEND_API_KEY` (see `.env.example`) for local dev.
- [ ] Update the **hosted** Supabase project -> Authentication -> Emails ->
      SMTP Settings:
  - Host: `smtp.resend.com`, Port: `465`, Username: `resend`
  - Password: the Resend API key
  - Sender email: `support@traklify.com`
  - Sender name: `Traklify`
- [ ] Re-test with a real signup/invite and confirm the email is delivered
      (check Resend's dashboard logs + the actual `support@traklify.com`
      inbox for replies).

Temporary/local-only unblock if needed before the domain is verified: set the
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
