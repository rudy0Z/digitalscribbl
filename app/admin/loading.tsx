import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-ink-900 px-6 py-4">
        <Skeleton className="h-6 w-32 bg-white/20" />
        <Skeleton className="h-5 w-80 bg-white/20" />
      </nav>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    </div>
  )
}
