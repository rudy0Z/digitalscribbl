'use client'

import { useState, useTransition } from 'react'

interface ExportRequestFormProps {
  activeBatchId: string
  batchLabel: string
  groups: Array<{ id: string; name: string }>
}

export default function ExportRequestForm({ activeBatchId, batchLabel, groups }: ExportRequestFormProps) {
  const [requestType, setRequestType] = useState<'batch' | 'group'>('batch')
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setMessage(null)
    setIsError(false)

    startTransition(async () => {
      const res = await fetch('/api/export-requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          batch_id: requestType === 'batch' ? activeBatchId : null,
          group_id: requestType === 'group' ? groupId : null,
          note,
        }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setIsError(true)
        setMessage(body.error ?? 'Could not request export')
        return
      }

      setMessage(body.duplicate
        ? 'You already have an open request for this export.'
        : 'Request saved. This will be handled manually after scribbling finishes.'
      )
      setNote('')
    })
  }

  return (
    <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 print:hidden">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Manual exports</p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink-900">Need a batch or group photo set?</h2>
          <p className="mt-1 max-w-2xl text-sm text-amber-900/70">
            For now, the app only lets you download your own card. Batch and group exports are collected as requests so the live scribbling phase stays light.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_180px]">
        <label className="text-xs font-medium text-ink-900">
          Export type
          <select
            value={requestType}
            onChange={e => setRequestType(e.target.value as 'batch' | 'group')}
            className="input mt-1"
          >
            <option value="batch">My batch</option>
            <option value="group" disabled={groups.length === 0}>Friend group</option>
          </select>
        </label>

        {requestType === 'group' ? (
          <label className="text-xs font-medium text-ink-900">
            Friend group
            <select value={groupId} onChange={e => setGroupId(e.target.value)} className="input mt-1">
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-xs font-medium text-ink-900">
            Batch
            <input value={batchLabel} readOnly className="input mt-1 bg-white/70" />
          </label>
        )}

        <label className="text-xs font-medium text-ink-900">
          Note
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={240}
            placeholder="Optional"
            className="input mt-1"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || (requestType === 'group' && !groupId)}
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving request...' : 'Request manual export'}
        </button>
        {message && (
          <p className={isError ? 'text-sm text-red-600' : 'text-sm text-green-700'}>{message}</p>
        )}
      </div>
    </section>
  )
}
