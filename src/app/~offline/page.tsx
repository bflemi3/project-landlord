import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center px-6">
      <div className="bg-muted mx-auto mb-8 flex size-12 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground size-6" />
      </div>
      <h1 className="text-foreground text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground mt-3 text-base">Check your connection and try again.</p>
    </div>
  )
}
