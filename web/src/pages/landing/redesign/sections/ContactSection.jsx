import { useRef, useState } from 'react'
import ContactModal from './ContactModal'
import { SectionDeck, SectionHeading, SectionMarker, SectionScaffold, Reveal } from './_typography'

export default function ContactSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const triggerRef = useRef(null)

  return (
    <>
      <SectionScaffold sectionKey="contact" id="contact" ariaLabel="Contact" layout="contact">
        <SectionMarker number={5} label="CONTACT" />
        <SectionHeading lines={['Let’s build a better', 'way to play.']} times={[0.928, 0.936]} />
        <Reveal at={0.94} end={0.949}>
          <SectionDeck>
            Have a question, suggestion, or just want to say hi?
            <br />
            I’d love to hear from you.
          </SectionDeck>
        </Reveal>
        <Reveal at={0.95} end={0.96}>
          <div className="deck-section__cta">
            <a href="mailto:reymarkdecastro59@gmail.com">Email Me</a>
            <button
              ref={triggerRef}
              className="deck-section__cta--secondary"
              type="button"
              onClick={() => setModalOpen(true)}
            >
              Contact Form
            </button>
          </div>
        </Reveal>
      </SectionScaffold>
      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        returnFocusRef={triggerRef}
      />
    </>
  )
}
