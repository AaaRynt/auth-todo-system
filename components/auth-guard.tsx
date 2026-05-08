// components/auth-guard.tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const PUBLIC_PATHS = ['/', '/auth']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)),
  )
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null)

  useEffect(() => {
    if (isPublicPath) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const user = window.localStorage.getItem('user')
      if (!user) {
        router.replace('/auth')
        return
      }
      setAuthorizedPath(pathname)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isPublicPath, pathname, router])

  if (!isPublicPath && authorizedPath !== pathname) return null
  return children
}
