import { Skeleton } from '@/components/ui/skeleton'

export function HomeSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Sign out placeholder — top right */}
      <div className="flex justify-end px-6 pt-5">
        <Skeleton className="size-7 rounded-full" />
      </div>

      {/* Centered content — matches empty state */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-2xl">
          {/* Wordmark */}
          <div className="mb-8 text-center">
            <Skeleton className="mx-auto h-7 w-28 rounded-lg" />
          </div>

          {/* Greeting + subtitle */}
          <div className="mb-10 text-center">
            <Skeleton className="mx-auto h-8 w-64 rounded-lg md:h-9" />
            <Skeleton className="mx-auto mt-3 h-5 w-44 rounded-lg" />
          </div>

          {/* Two cards — stacked on mobile, side by side on desktop */}
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-2xl md:h-56" />
            <Skeleton className="h-48 w-full rounded-2xl md:h-56" />
          </div>

          {/* Reassurance text */}
          <div className="mt-5 flex justify-center">
            <Skeleton className="h-10 w-72 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
