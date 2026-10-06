import { useRef, useState } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const API_URL = import.meta.env.VITE_API_URL
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FALLBACK_MESSAGE = 'Something went wrong. Try again in a bit.'
const ERROR_MESSAGES = {
  invalid_input: 'Please double-check the highlighted field.',
  captcha_failed: "Captcha didn't verify. Try again.",
  email_send_failed: "Couldn't send right now. Please email me directly.",
  server_misconfigured: "Contact form isn't quite ready. Email me directly for now.",
}

function validateForm({ name, email, message, captchaToken }) {
  if (!name.trim()) return { valid: false, reason: 'name' }
  if (!EMAIL_RE.test(email.trim())) return { valid: false, reason: 'email' }
  if (message.trim().length < 10) return { valid: false, reason: 'message' }
  if (!captchaToken) return { valid: false, reason: 'captchaToken' }
  return { valid: true, reason: '' }
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [invalidField, setInvalidField] = useState('')
  const captchaRef = useRef(null)

  const configurationReady = Boolean(API_URL && HCAPTCHA_SITE_KEY)
  const validation = validateForm({ name, email, message, captchaToken })
  const submitDisabled = !configurationReady || !validation.valid || status === 'sending'

  const resetCaptcha = () => {
    setCaptchaToken('')
    captchaRef.current?.resetCaptcha()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const currentValidation = validateForm({ name, email, message, captchaToken })
    if (!configurationReady || !currentValidation.valid) return

    setStatus('sending')
    setErrorMessage('')
    setInvalidField('')

    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, captchaToken }),
      })
      const result = await response.json().catch(() => ({}))

      if (response.ok) {
        setName('')
        setEmail('')
        setMessage('')
        resetCaptcha()
        setStatus('success')
        return
      }

      setInvalidField(result.error === 'invalid_input' ? result.field || '' : '')
      setErrorMessage(ERROR_MESSAGES[result.error] || FALLBACK_MESSAGE)
      resetCaptcha()
      setStatus('error')
    } catch {
      setInvalidField('')
      setErrorMessage(FALLBACK_MESSAGE)
      resetCaptcha()
      setStatus('error')
    }
  }

  return (
    <form id="contact-form" className="deck-section__form" onSubmit={handleSubmit}>
      <div className="deck-section__form-field">
        <label htmlFor="contact-name">Your name</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          aria-invalid={invalidField === 'name'}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="deck-section__form-field">
        <label htmlFor="contact-email">Your email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          value={email}
          aria-invalid={invalidField === 'email'}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="deck-section__form-field">
        <label htmlFor="contact-message">Message (10+ characters)</label>
        <textarea
          id="contact-message"
          name="message"
          maxLength={5000}
          value={message}
          aria-invalid={invalidField === 'message'}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      {configurationReady && (
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={setCaptchaToken}
          onExpire={() => setCaptchaToken('')}
          onError={() => setCaptchaToken('')}
        />
      )}

      <button className="deck-section__form-submit" type="submit" disabled={submitDisabled}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      <div aria-live="polite">
        {!configurationReady && (
          <p className="deck-section__form-status" data-state="error">
            Contact form temporarily unavailable.{' '}
            <a href="mailto:reymarkdecastro59@gmail.com">Email me directly.</a>
          </p>
        )}
        {status === 'success' && (
          <p className="deck-section__form-status" data-state="success">
            Thanks, I got it. I&apos;ll reply within a day or two.
          </p>
        )}
        {status === 'error' && (
          <p className="deck-section__form-status" data-state="error">
            {errorMessage} <a href="mailto:reymarkdecastro59@gmail.com">Email me directly.</a>
          </p>
        )}
      </div>
    </form>
  )
}
