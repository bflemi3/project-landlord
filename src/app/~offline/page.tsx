import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <div className="mx-auto mb-8 flex size-12 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">You&apos;re offline</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Check your connection and try again.
      </p>
    </div>
  )
}
