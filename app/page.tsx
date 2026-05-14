// app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function redirectBySession() {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      }).catch(() => null)

      if (cancelled) return

      router.replace(response?.ok ? '/main' : '/auth')
    }

    redirectBySession()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting...</p>
    </main>
  )
}
