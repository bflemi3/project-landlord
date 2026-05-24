import { Fraunces, Geist } from 'next/font/google'

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  display: 'swap',
})

const geistSans = Geist({
  variable: '--font-editorial',
  subsets: ['latin'],
  display: 'swap',
})

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${geistSans.variable} flex min-h-svh flex-col`}>
      {children}
    </div>
  )
}
