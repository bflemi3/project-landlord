'use client'

import { SerwistProvider as Provider } from '@serwist/next/react'

export function SerwistProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider swUrl="/sw.js" disable={process.env.NODE_ENV === 'development'}>
      {children}
    </Provider>
  )
}
