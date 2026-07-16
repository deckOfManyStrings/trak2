import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Traklify",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          &larr; Back to Traklify
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is a starting template, not reviewed legal advice. Given
        Traklify stores client/participant demographic and program data,
        have a lawyer review and tailor this - including any
        jurisdiction-specific requirements - before relying on it for real
        programs.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-semibold">1. What we collect</h2>
          <p className="mt-1 text-muted-foreground">
            Account information (name, email) for admins and staff you
            invite, and information you choose to enter about the clients or
            participants in your program (e.g. name, date of birth, date of
            admission, location, program progress notes).
          </p>
        </section>

        <section>
          <h2 className="font-semibold">2. How we use it</h2>
          <p className="mt-1 text-muted-foreground">
            Solely to provide the Traklify service to you - authenticating
            your account, storing and displaying the records you create, and
            generating documents (such as Annual Assessment Reports) that
            you request.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">3. Who can see it</h2>
          <p className="mt-1 text-muted-foreground">
            Data is scoped to your account. Staff you invite can see data
            for the location(s) they are assigned to; only admins on your
            account can see everything within it. We do not sell or share
            your data with third parties except the infrastructure providers
            necessary to run the service (see below).
          </p>
        </section>

        <section>
          <h2 className="font-semibold">4. Infrastructure providers</h2>
          <p className="mt-1 text-muted-foreground">
            Traklify is built on Supabase (database, authentication) and
            Resend (transactional email for invites, confirmations, and
            password resets). Data may be processed by these providers
            solely to deliver the service.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">5. Data retention</h2>
          <p className="mt-1 text-muted-foreground">
            We retain your account&apos;s data for as long as your account is
            active. You may request deletion of your account and its data by
            contacting us.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">6. Security</h2>
          <p className="mt-1 text-muted-foreground">
            We use reasonable technical measures (encrypted connections,
            access controls scoped by account and role) to protect your
            data, but no system is completely secure.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">7. Changes</h2>
          <p className="mt-1 text-muted-foreground">
            We may update this policy from time to time. Continued use of
            Traklify after changes take effect constitutes acceptance of the
            updated policy.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">8. Contact</h2>
          <p className="mt-1 text-muted-foreground">
            Questions about this policy, or requests regarding your data,
            can be sent to{" "}
            <a
              href="mailto:support@traklify.com"
              className="underline underline-offset-4"
            >
              support@traklify.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
