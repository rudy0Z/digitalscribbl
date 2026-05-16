import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <PageShellSkeleton>
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-80 rounded-[28px]" />
        <Skeleton className="h-72 rounded-2xl" />
      </section>
      <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </section>
    </PageShellSkeleton>
  )
}
