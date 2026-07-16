import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions - Traklify",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          &larr; Back to Traklify
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Terms &amp; Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is a starting template, not reviewed legal advice. Have a
        lawyer review and tailor this before relying on it for real programs
        or clients.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
        <section>
          <h2 className="font-semibold">1. Acceptance of terms</h2>
          <p className="mt-1 text-muted-foreground">
            By creating an account or using Traklify, you agree to these
            Terms &amp; Conditions. If you do not agree, do not use the
            service.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">2. Accounts</h2>
          <p className="mt-1 text-muted-foreground">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your
            account, including actions taken by staff you invite.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">3. Client and participant data</h2>
          <p className="mt-1 text-muted-foreground">
            You are solely responsible for ensuring you have the appropriate
            legal basis, consent, and authorization to enter any client or
            participant information (including demographic and
            program-related data) into Traklify, and for complying with any
            laws or regulations that apply to your program.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">4. Subscription plans</h2>
          <p className="mt-1 text-muted-foreground">
            Free plan accounts are subject to usage limits (currently one
            location and two clients). Premium access may be granted at our
            discretion; features and limits may change over time.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">5. Termination</h2>
          <p className="mt-1 text-muted-foreground">
            We may suspend or terminate access to Traklify at any time for
            violation of these terms or for any other reason, with or
            without notice.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">6. Disclaimer</h2>
          <p className="mt-1 text-muted-foreground">
            Traklify is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for any damages arising from use of the
            service.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">7. Changes</h2>
          <p className="mt-1 text-muted-foreground">
            We may update these terms from time to time. Continued use of
            Traklify after changes take effect constitutes acceptance of the
            updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">8. Contact</h2>
          <p className="mt-1 text-muted-foreground">
            Questions about these terms can be sent to{" "}
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
