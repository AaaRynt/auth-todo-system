'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Group } from '@/components/features/'
import { buttonVariants } from '@/components/ui/'
import { cn } from '@/lib/utils'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.sessionStorage.getItem('main-welcome-shown') === 'true') return

      const user = JSON.parse(window.localStorage.getItem('user') || 'null') as {
        id: string
        username: string
      } | null

      if (!user?.username) return

      window.sessionStorage.setItem('main-welcome-shown', 'true')
      toast.info(`welcome,${user.username}`, { position: 'top-center' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="bg-background text-foreground relative flex min-h-dvh flex-1 flex-col">
      <Header />
      <main className="flex w-full flex-1">
        <Aside />
        <section className="relative flex flex-1 p-6">{children}</section>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="flex h-14 w-full items-center justify-between border-b px-4">
      <Link href="/main/todo" className="text-sm font-medium">
        Auth Todo
      </Link>
      <Group />
    </header>
  )
}

function Aside() {
  const navItems = [
    {
      href: '/main/todo',
      label: 'Todo',
    },
    {
      href: '/main/chart',
      label: 'Chart',
    },
    {
      href: '/main/setting',
      label: 'Setting',
    },
    {
      href: '/main/account',
      label: 'Account',
    },
  ]
  const pathname = usePathname()

  return (
    <aside className="bg-card/50 w-60 shrink-0 border-r px-4 py-12">
      <nav aria-label="Main navigation" className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'lg' }),
                'text-card-foreground w-full justify-start gap-2 text-lg',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
