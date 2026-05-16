import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function GroupsLoading() {
  return (
    <PageShellSkeleton>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageShellSkeleton>
  )
}
