import { Wordmark } from '@/components/wordmark'

export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-5 left-8 z-30 hidden md:block">
        <Wordmark className="text-[20px]" href="/app" />
      </div>
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </>
  )
}
