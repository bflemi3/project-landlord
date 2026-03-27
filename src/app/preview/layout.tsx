import { redirect } from 'next/navigation'

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  return <>{children}</>
}
