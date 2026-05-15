'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BODY_STYLES, SHIRT_COLORS } from '@/lib/constants'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'
import HeadCropUpload from '@/components/avatar/HeadCropUpload'
import { cn } from '@/lib/utils/cn'

type Step = 1 | 2 | 3

interface FormState {
  displayName:     string
  enrollmentNumber: string
  academicGroupId: string
  programId:       string
  batchId:         string
  bodyStyle:       string
  shirtColor:      string
  headFrontUrl:    string | null
  headBackUrl:     string | null
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]   = useState<Step>(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm]   = useState<FormState>({
    displayName:      '',
    enrollmentNumber: '',
    academicGroupId:  '',
    programId:        '',
    batchId:          '',
    bodyStyle:        'M1',
    shirtColor:       '#F8F8F8',
    headFrontUrl:     null,
    headBackUrl:      null,
  })
  const [groups, setGroups]     = useState<{ id: string; name: string }[]>([])
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([])
  const [batches, setBatches]   = useState<{ id: string; label: string | null; graduation_year: number }[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // ── Load user + academic structure ────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setForm(f => ({
        ...f,
        displayName: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '',
      }))
    })

    supabase.from('academic_groups').select('id, name').order('name').then(({ data }) => {
      setGroups(data ?? [])
    })
  }, [])

  // Load programs when group changes
  useEffect(() => {
    if (!form.academicGroupId) { setPrograms([]); setBatches([]); return }
    supabase.from('programs')
      .select('id, name')
      .eq('academic_group_id', form.academicGroupId)
      .order('name')
      .then(({ data }) => setPrograms(data ?? []))
    setForm(f => ({ ...f, programId: '', batchId: '' }))
  }, [form.academicGroupId])

  // Load batches when program changes
  useEffect(() => {
    if (!form.programId) { setBatches([]); return }
    supabase.from('batches')
      .select('id, label, graduation_year')
      .eq('program_id', form.programId)
      .order('graduation_year', { ascending: false })
      .then(({ data }) => setBatches(data ?? []))
    setForm(f => ({ ...f, batchId: '' }))
  }, [form.programId])

  const set = (k: keyof FormState, v: string | null) =>
    setForm(f => ({ ...f, [k]: v }))

  // ── Step navigation ───────────────────────────────────────
  const canProceed1 = form.displayName.trim() && form.enrollmentNumber.trim() &&
    form.academicGroupId && form.programId && form.batchId

  const next = () => setStep(s => (s + 1) as Step)

  // ── Save & complete ───────────────────────────────────────
  const complete = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)

    const { error: err } = await supabase.from('users').update({
      display_name:       form.displayName.trim(),
      enrollment_number:  form.enrollmentNumber.trim(),
      academic_group_id:  form.academicGroupId,
      program_id:         form.programId,
      batch_id:           form.batchId,
      body_style:         form.bodyStyle as FormState['bodyStyle'],
      shirt_color:        form.shirtColor,
      head_front_url:     form.headFrontUrl,
      head_back_url:      form.headBackUrl,
      onboarding_completed: true,
    }).eq('id', userId)

    if (err) {
      setError('Could not save your profile — please try again.')
      setSaving(false)
      return
    }

    // 🎉 Confetti!
    try {
      const confetti = (await import('canvas-confetti')).default
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#1C1C1C', '#F8F8F8', '#6B8E6B', '#1E3A5F', '#F5F0E0'],
      })
    } catch { /* non-critical */ }

    router.push('/dashboard?new=1')
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-ink-900">scribbl</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your scribble shirt 🎽</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn(
              'flex-1 h-1.5 rounded-full transition-all duration-500',
              s <= step ? 'bg-ink-900' : 'bg-gray-200'
            )} />
          ))}
        </div>

        {/* ── Step 1 — Profile ── */}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-ink-900">Your profile</h2>

            <div>
              <label className="label">Display name</label>
              <input className="input" value={form.displayName}
                onChange={e => set('displayName', e.target.value)} placeholder="Your name" />
            </div>

            <div>
              <label className="label">Enrollment number</label>
              <input className="input" value={form.enrollmentNumber}
                onChange={e => set('enrollmentNumber', e.target.value)} placeholder="e.g. 22CS001" />
            </div>

            <div>
              <label className="label">Academic group</label>
              <select className="input" value={form.academicGroupId}
                onChange={e => set('academicGroupId', e.target.value)}>
                <option value="">Select group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Program</label>
              <select className="input" value={form.programId}
                onChange={e => set('programId', e.target.value)}
                disabled={!form.academicGroupId}>
                <option value="">Select program…</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Batch / Graduation year</label>
              <select className="input" value={form.batchId}
                onChange={e => set('batchId', e.target.value)}
                disabled={!form.programId}>
                <option value="">Select batch…</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.label ?? b.graduation_year}</option>)}
              </select>
            </div>

            <button
              className="btn-primary w-full mt-2"
              disabled={!canProceed1}
              onClick={next}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 2 — Avatar ── */}
        {step === 2 && (
          <div className="card p-6 space-y-6">
            <h2 className="text-lg font-semibold text-ink-900">Create your avatar</h2>

            {/* Live preview */}
            <div className="flex justify-center">
              <AvatarDisplay
                bodyStyle={form.bodyStyle}
                shirtColor={form.shirtColor}
                headFrontUrl={form.headFrontUrl}
                size="lg"
              />
            </div>

            {/* Body picker */}
            <div>
              <label className="label">Body style</label>
              <div className="grid grid-cols-3 gap-2">
                {BODY_STYLES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => set('bodyStyle', b.id)}
                    className={cn(
                      'p-2 rounded-xl border-2 text-xs text-center transition',
                      form.bodyStyle === b.id ? 'border-ink-900 bg-ink-900/5' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="text-2xl mb-1">{b.gender === 'M' ? '👦' : '👧'}</div>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shirt colour */}
            <div>
              <label className="label">Shirt colour</label>
              <div className="flex gap-3">
                {SHIRT_COLORS.map(c => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => set('shirtColor', c.hex)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition',
                      form.shirtColor === c.hex ? 'border-ink-900 scale-110' : 'border-transparent'
                    )}
                    style={{ background: c.hex, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                  />
                ))}
              </div>
            </div>

            {/* Head upload */}
            <div className="space-y-3">
              <div>
                <label className="label">Front head (AI-generated cartoon)</label>
                <p className="text-xs text-gray-400 mb-2">
                  Generate your cartoon in ChatGPT or Ideogram, download, then upload here.
                </p>
                <HeadCropUpload
                  side="front"
                  currentUrl={form.headFrontUrl}
                  onUploaded={url => set('headFrontUrl', url)}
                />
              </div>
              <div>
                <label className="label">Back head</label>
                <HeadCropUpload
                  side="back"
                  currentUrl={form.headBackUrl}
                  onUploaded={url => set('headBackUrl', url)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-primary flex-1" onClick={next}>Next →</button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Done ── */}
        {step === 3 && (
          <div className="card p-8 text-center space-y-6">
            <div className="flex justify-center">
              <AvatarDisplay
                bodyStyle={form.bodyStyle}
                shirtColor={form.shirtColor}
                headFrontUrl={form.headFrontUrl}
                size="xl"
              />
            </div>

            <div>
              <h2 className="text-2xl font-display font-bold text-ink-900">Your shirt is ready! 🎉</h2>
              <p className="text-gray-500 text-sm mt-1">
                Share your profile and let your batchmates scribble on your shirt.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                className="btn-primary w-full text-base py-3"
                onClick={complete}
                disabled={saving}
              >
                {saving ? 'Saving…' : '✓ Enter Scribbl'}
              </button>
              <button className="btn-secondary w-full" onClick={() => setStep(2)}>← Edit avatar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
