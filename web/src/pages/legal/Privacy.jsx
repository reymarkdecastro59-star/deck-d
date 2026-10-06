import { LegalLayout } from './LegalLayout'

const EFFECTIVE = 'September 12, 2026'

export default function Privacy() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy" effective={EFFECTIVE}>
      <Section title="What we collect">
        <p>
          The bare minimum to make DECK'D work: your email (for sign-in), the sessions the tracker
          reports (game name, executable path, start time, duration, optional label), and the
          devices you've paired (a per-install ID and a human-readable name you set). We do not
          collect keystrokes, screenshots, chat, or the contents of games you play.
        </p>
      </Section>

      <Section title="What we don't collect">
        <p>
          No third-party ad tracking. No analytics SDKs. No fingerprinting. The tracker only wakes
          up for known game processes — background apps, work software, and browsers are ignored by
          design.
        </p>
      </Section>

      <Section title="Where it lives">
        <p>
          Session and profile data is stored in Amazon DynamoDB in the AWS ap-southeast-2 region.
          Game metadata (cover art, genres, Metacritic scores) is cached from RAWG.io and Metacritic
          — we don't push your play history to those services in return.
        </p>
      </Section>

      <Section title="Who sees it">
        <p>
          Only you, when you're signed in. We don't sell or share your data. The three exceptions:
          (1) AWS as our infrastructure provider processes it on our behalf, (2) an anonymised
          summary of your library may be sent to a Bedrock LLM to generate curated recommendations —
          the LLM sees game names but never your account identifier, (3) if legally compelled, we
          may disclose data to authorities and will notify you unless prohibited.
        </p>
      </Section>

      <Section title="Cookies & local storage">
        <p>
          The web app stores your Cognito auth tokens in <em>sessionStorage</em> (cleared when you
          close the tab), and your onboarding progress plus UI preferences in <em>localStorage</em>{' '}
          (persists until you clear it). No third-party cookies. Clearing browser storage signs you
          out and resets local preferences — server-side data is untouched.
        </p>
      </Section>

      <Section title="Your controls">
        <p>
          Export everything you've contributed via <em>Settings → Data &amp; privacy → Export</em>{' '}
          (CSV or JSON). Erase everything via the same panel — the delete is irreversible and
          removes your Cognito identity in the same flow. Revoke a paired device from{' '}
          <em>Devices</em>.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Privacy questions, GDPR/CCPA requests, or breach notifications: reach us through the
          landing page's contact form. We aim to respond within one week.
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
