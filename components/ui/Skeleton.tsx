import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-gray-200/70', className)} />
}

export function PageShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-50">
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}
