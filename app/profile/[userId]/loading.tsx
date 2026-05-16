import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <PageShellSkeleton>
      <Skeleton className="mb-5 h-48 rounded-[28px]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-[760px] rounded-[28px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </PageShellSkeleton>
  )
}
