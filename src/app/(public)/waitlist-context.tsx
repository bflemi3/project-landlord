'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

export type WaitlistRole = 'landlord' | 'tenant'

const STORAGE_KEY = 'mabenn_waitlist'

// useLayoutEffect warns during SSR; on the server there's nothing to read anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

type WaitlistContextValue = {
  submitted: boolean
  // True when the confirmation was restored from a prior visit (suppresses the
  // success animation — it's a remembered state, not a fresh moment of success).
  restored: boolean
  // The inline toggle (landlord/tenant). Presets the modal's role and selects
  // the role-specific success copy.
  role: WaitlistRole
  setRole: (r: WaitlistRole) => void
  // Progressive enrich modal.
  modalOpen: boolean
  // Email carried from the gate into the modal (editable there).
  email: string
  // Open the modal with the captured email (the gate write already happened).
  openModal: (email: string) => void
  closeModal: () => void
  // Persist + flip to the confirmation after a successful enrich.
  markJoined: (r: WaitlistRole) => void
}

const WaitlistContext = createContext<WaitlistContextValue>({
  submitted: false,
  restored: false,
  role: 'landlord',
  setRole: () => {},
  modalOpen: false,
  email: '',
  openModal: () => {},
  closeModal: () => {},
  markJoined: () => {},
})

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [submitted, setSubmitted] = useState(false)
  const [restored, setRestored] = useState(false)
  // Which CTA brought them to the form — landlord by default; tenant CTAs flip it.
  const [role, setRole] = useState<WaitlistRole>('landlord')
  const [modalOpen, setModalOpen] = useState(false)
  const [email, setEmail] = useState('')

  // Returning visitors who already joined on this browser see the confirmation
  // straight away. Runs before paint so the form never flashes first.
  useIsomorphicLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { role?: WaitlistRole }
      if (saved.role === 'tenant' || saved.role === 'landlord') setRole(saved.role)
      setSubmitted(true)
      setRestored(true)
    } catch {
      // Malformed/blocked storage — fall back to showing the form.
    }
  }, [])

  function openModal(capturedEmail: string) {
    setEmail(capturedEmail)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  // Called at the gate the moment the email is captured — they're on the list,
  // so the inline form flips to the confirmation. The enrich modal opens
  // separately and closing it leaves the confirmation in place.
  function markJoined(r: WaitlistRole) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: r, ts: Date.now() }))
    } catch {
      // Private mode / storage disabled — confirmation still shows for this session.
    }
    setRole(r)
    setSubmitted(true)
  }

  return (
    <WaitlistContext.Provider
      value={{
        submitted,
        restored,
        role,
        setRole,
        modalOpen,
        email,
        openModal,
        closeModal,
        markJoined,
      }}
    >
      {children}
    </WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}
