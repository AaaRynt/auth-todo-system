// components/features/cookie-notice.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'

const cookieNoticeStorageKey = 'auth-todo-cookie-notice-accepted'

export function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setIsVisible(window.localStorage.getItem(cookieNoticeStorageKey) !== 'true')
      } catch {
        setIsVisible(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const accept = () => {
    try {
      window.localStorage.setItem(cookieNoticeStorageKey, 'true')
    } catch {}

    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <aside role="status" aria-label="Cookie notice" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4">
      {/* 除非我提出，之后不要再让Codex考虑响应式设计了！ */}
      <div className="bg-popover text-popover-foreground ring-foreground/10 mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-lg p-3 shadow-md ring-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          This website uses necessary cookies to keep you signed in and maintain your session securely.
        </p>
        <Button type="button" onClick={accept}>
          Got it
        </Button>
      </div>
    </aside>
  )
}
