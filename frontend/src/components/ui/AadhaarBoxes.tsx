import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react'

/**
 * Three-box 12-digit Aadhaar input.
 *
 * Extracted from features/employees/EmployeeForm.tsx, which had it as a private
 * helper, so the public referrer intake page uses the identical control instead
 * of growing a second implementation. Both entry points are gated on the same
 * server-side uniqueness check.
 */
export function AadhaarBoxes({
  value,
  onChange,
  invalid = false,
}: {
  value: string
  onChange: (digits: string) => void
  invalid?: boolean
}) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const digits = (value || '').replace(/\D/g, '').slice(0, 12)

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const part = e.target.value.replace(/\D/g, '').slice(0, 4)
    const next = (digits.slice(0, i * 4) + part + digits.slice((i + 1) * 4)).slice(0, 12)
    onChange(next)
    if (part.length === 4 && i < 2) refs[i + 1].current?.focus()
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && i > 0 && e.currentTarget.value === '') {
      e.preventDefault()
      const prev = refs[i - 1].current
      prev?.focus()
      prev?.select()
    }
  }

  const handlePaste = (_i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 12)
    if (!pasted) return
    onChange(pasted)
    requestAnimationFrame(() => {
      const nextIdx = Math.min(Math.floor(pasted.length / 4), 2)
      refs[nextIdx].current?.focus()
    })
  }

  const border = invalid
    ? 'border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/10'
    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          value={digits.slice(i * 4, (i + 1) * 4)}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          placeholder="____"
          aria-label={`Aadhaar digits ${i + 1} of 3`}
          aria-invalid={invalid || undefined}
          className={`w-[74px] h-10 px-2 text-center text-[15px] tracking-[0.25em] font-mono bg-white border ${border} rounded-xl outline-none transition-all duration-150 focus:ring-4 placeholder:text-slate-300`}
        />
      ))}
    </div>
  )
}
