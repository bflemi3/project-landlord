'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

export type WaitlistRole = 'landlord' | 'tenant'

const STORAGE_KEY = 'mabenn_waitlist'

// useLayoutEffect warns during SSR; on the server there's nothing to read anyway.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

type WaitlistContextValue = {
  submitted: boolean
  // True when the confirmation was restored from a prior visit (suppresses the
  // success animation — it's a remembered state, not a fresh moment of success).
  restored: boolean
  role: WaitlistRole
  setRole: (r: WaitlistRole) => void
  // Persist + flip to the confirmation after a successful submit.
  markJoined: (r: WaitlistRole) => void
}

const WaitlistContext = createContext<WaitlistContextValue>({
  submitted: false,
  restored: false,
  role: 'landlord',
  setRole: () => {},
  markJoined: () => {},
})

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [submitted, setSubmitted] = useState(false)
  const [restored, setRestored] = useState(false)
  // Which CTA brought them to the form — landlord by default; tenant CTAs flip it.
  const [role, setRole] = useState<WaitlistRole>('landlord')

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
    <WaitlistContext.Provider value={{ submitted, restored, role, setRole, markJoined }}>
      {children}
    </WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}
