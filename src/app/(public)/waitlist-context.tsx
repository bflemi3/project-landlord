'use client'

import { createContext, useContext, useState } from 'react'

const WaitlistContext = createContext<{
  submitted: boolean
  setSubmitted: (v: boolean) => void
}>({ submitted: false, setSubmitted: () => {} })

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [submitted, setSubmitted] = useState(false)
  return (
    <WaitlistContext.Provider value={{ submitted, setSubmitted }}>
      {children}
    </WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}
