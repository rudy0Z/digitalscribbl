import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <PageShellSkeleton>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-[420px]" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-40" />
          <Skeleton className="h-28" />
        </div>
      </div>
    </PageShellSkeleton>
  )
}
