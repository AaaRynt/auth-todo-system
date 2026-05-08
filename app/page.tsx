// app/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const user = window.localStorage.getItem('user')

      router.replace(user ? '/main' : '/auth')
    })

    return () => window.cancelAnimationFrame(frame)
  }, [router])

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting...</p>
    </main>
  )
}
