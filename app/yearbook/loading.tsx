import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function YearbookLoading() {
  return (
    <PageShellSkeleton>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-16 w-56 rounded-2xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <Skeleton className="mt-5 h-44 rounded-2xl" />
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </PageShellSkeleton>
  )
}
