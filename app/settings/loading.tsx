import { PageShellSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <PageShellSkeleton>
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </PageShellSkeleton>
  )
}
