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

export default function BatchSelect({ batches, activeBatchId }: Props) {
  return (
    <select
      className="input text-sm"
      defaultValue={activeBatchId}
      onChange={e => {
        const val = e.target.value
        const url = new URL(window.location.href)
        if (val) {
          url.searchParams.set('batch', val)
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
  )
}
