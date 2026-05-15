'use client'

interface Batch {
  id: string
  label: string | null
  graduation_year: number
  programName: string
}

interface Props {
  batches: Batch[]
  activeBatchId: string
}

export default function YearbookControls({ batches, activeBatchId }: Props) {
  return (
    <div className="flex items-center gap-3">
      <select
        className="input text-sm w-auto"
        defaultValue={activeBatchId}
        onChange={e => {
          const url = new URL(window.location.href)
          if (e.target.value) {
            url.searchParams.set('batch', e.target.value)
          } else {
            url.searchParams.delete('batch')
          }
          window.location.href = url.toString()
        }}
      >
        <option value="">All batches</option>
        {batches.map(b => (
          <option key={b.id} value={b.id}>
            {b.programName} · {b.label ?? b.graduation_year}
          </option>
        ))}
      </select>

      <button
        onClick={() => window.print()}
        className="btn-primary text-sm print:hidden"
      >
        🖨️ Print / Save PDF
      </button>
    </div>
  )
}
