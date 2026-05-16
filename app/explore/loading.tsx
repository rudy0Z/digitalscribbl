import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function ExploreLoading() {
  return (
    <PageShellSkeleton>
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="mt-5 h-12 rounded-2xl" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </PageShellSkeleton>
  )
}
