import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import ContactForm from './ContactForm'

export default function ContactModal({ open, onClose, returnFocusRef }) {
  const panelRef = useRef(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const returnFocusTarget = returnFocusRef.current
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector('input')?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()

      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      returnFocusTarget?.focus()
    }
  }, [open, onClose, returnFocusRef])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="deck-contact-modal"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            ref={panelRef}
            className="deck-contact-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="deck-contact-modal__header">
              <div>
                <p className="deck-contact-modal__label">CONTACT</p>
                <h2 id="contact-modal-title">Send a message.</h2>
              </div>
              <button type="button" className="deck-contact-modal__close" onClick={onClose}>
                Close
              </button>
            </div>
            <ContactForm />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
