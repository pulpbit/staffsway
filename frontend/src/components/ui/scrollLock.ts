import { useEffect } from 'react'

// Overlays can stack (a modal opened from inside a drawer), and each one
// independently locks body scroll on mount and unlocks it on unmount. Without
// a shared counter, closing the topmost overlay would unlock scrolling even
// though an overlay underneath is still open.
let locks = 0
let savedOverflow = ''

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (locks === 0) {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    locks += 1
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.body.style.overflow = savedOverflow
    }
  }, [active])
}
