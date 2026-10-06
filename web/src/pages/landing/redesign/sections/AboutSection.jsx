import { SectionDeck, SectionHeading, SectionMarker, SectionScaffold, Reveal } from './_typography'
export default function AboutSection() {
  return (
    <SectionScaffold sectionKey="about" id="about" ariaLabel="About">
      <SectionMarker number={2} label="ABOUT" />
      <SectionHeading lines={['Your library,', 'connected.']} times={[0.17, 0.19]} />
      <Reveal at={0.2} end={0.21}>
        <SectionDeck>
          More than a list — a complete view of your
          <br className="desktop-break" /> games across platforms, in one place.
        </SectionDeck>
      </Reveal>
      <Reveal at={0.267} end={0.277}>
        <div className="deck-about-notes">
          <span>
            Your entire
            <br />
            <strong>library</strong>
          </span>
          <span>
            A more personal
            <br />
            <strong>gaming experience</strong>
          </span>
        </div>
      </Reveal>
    </SectionScaffold>
  )
}
