import { LegalLayout } from './LegalLayout'

const EFFECTIVE = 'September 12, 2026'

export default function Terms() {
  return (
    <LegalLayout eyebrow="Legal" title="Terms of Service" effective={EFFECTIVE}>
      <Section title="What DECK'D does">
        <p>
          DECK'D tracks the games you play across launchers — no imports from platform APIs, just a
          small agent that watches for game processes on your machine. We show you the honest
          version: wall-clock hours (overlap stripped), a decay-weighted momentum number, and a
          library grouped by canonical game title. Nothing here is sponsored, ranked to sell you a
          game, or optimised for time-on-site.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You sign in through AWS Cognito with an email address. That account is yours — we don't
          resell it, share it, or run marketing against it. If you delete your account from{' '}
          <em>Settings → Data &amp; privacy</em>, we erase every DynamoDB record we hold for you and
          remove the Cognito identity in the same transaction. If either half fails, you keep the
          right to retry.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Use DECK'D for personal gaming habit tracking. Don't try to exfiltrate other users' data,
          reverse the anti-abuse rate limits, or use the API to build a competing surface without
          asking first. If you find a security issue, tell us — we won't sue you for reporting it.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          DECK'D is provided as-is while it's in active development. We don't promise 100% uptime,
          we don't offer a refund policy (the service is free), and we may change features between
          releases. Breaking changes to the API or data model will be flagged in the changelog and —
          where reasonable — announced in-app before they land.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the extent allowed by law, DECK'D and its authors are not liable for any indirect,
          incidental, or consequential damages arising from your use of the service. This is a
          hobby-scale product built for people who want honest gaming stats, not a mission-critical
          system.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, disputes, or takedown requests: use the contact form on the landing page.
          Continued use after we update these terms means you accept the new version. We'll
          highlight material changes in the app when they happen.
        </p>
      </Section>
    </LegalLayout>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[16px] font-medium text-[var(--app-fg-strong)]">{title}</h2>
      <div className="mt-2 text-[14px] leading-relaxed text-[var(--app-fg-muted)]">{children}</div>
    </section>
  )
}
