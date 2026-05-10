// app/main/layout.tsx
'use client'

import { Folder, ListChecks, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { TlocalUser } from '@/app/data/type'
import { NewGroupDialog } from '@/app/main/todo/new-group-dialog'
import { TodoProvider, useTodoContext } from '@/app/main/todo/todo-provider'
import { Account, Group } from '@/components/features/'
import { Input, buttonVariants } from '@/components/ui/'
import { cn } from '@/lib/utils'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TlocalUser>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedUser = normalizeLocalUser(JSON.parse(window.localStorage.getItem('user') || 'null') as TlocalUser)

      if (storedUser) {
        window.localStorage.setItem('user', JSON.stringify(storedUser))
      }

      setUser(storedUser)

      if (storedUser?.username && window.sessionStorage.getItem('main-welcome-shown') !== 'true') {
        window.sessionStorage.setItem('main-welcome-shown', 'true')
        toast.info(`welcome,${storedUser.username}`, { position: 'top-center' })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <TodoProvider>
      <div className="bg-background text-foreground relative flex min-h-dvh flex-1 flex-col">
        <Header />
        <main className="mt-14 flex min-h-0 w-full flex-1">
          <Aside user={user} />
          <section className="relative flex flex-1 p-6">{children}</section>
        </main>
      </div>
    </TodoProvider>
  )
}

function Header() {
  return (
    <header className="bg-background fixed top-0 right-0 left-0 z-50 flex h-14 w-full items-center justify-between border-b px-4">
      <Link href="/main/all" className="text-sm font-medium">
        Auth Todo
      </Link>
      <Group />
    </header>
  )
}

function Aside({ user }: { user: TlocalUser }) {
  const pathname = usePathname()
  const { groups, search, setSearch, createGroup } = useTodoContext()
  const activeGroup = getActiveGroup(pathname)

  return (
    <aside className="bg-card/50 sticky top-14 flex h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col border-r p-4">
      <nav aria-label="Todo navigation" className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search todos by title"
            className="pl-9"
          />
        </div>
        <hr />
        <NewGroupDialog groups={groups} onCreateGroup={createGroup} />
        <Link
          href="/main/all"
          aria-current={pathname === '/main/all' ? 'page' : undefined}
          className={cn(
            buttonVariants({ variant: pathname === '/main/all' ? 'secondary' : 'ghost', size: 'lg' }),
            'text-card-foreground w-full justify-start gap-2',
          )}
        >
          <ListChecks className="size-4" aria-hidden="true" />
          All Tasks
        </Link>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="text-muted-foreground px-3 text-xs font-medium tracking-wide uppercase">Groups</div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {groups.map((group) => {
              const active = activeGroup === group

              return (
                <Link
                  key={group}
                  href={`/main/group/${encodeURIComponent(group)}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
                    'text-card-foreground w-full justify-start gap-2',
                  )}
                >
                  <Folder className="size-4" aria-hidden="true" />
                  <span className="truncate">{group}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      <Account user={user} />
    </aside>
  )
}

function normalizeLocalUser(user: TlocalUser) {
  if (!user) return null

  return {
    ...user,
    createdAt: user.createdAt || Date.now(),
  }
}

function getActiveGroup(pathname: string) {
  if (!pathname.startsWith('/main/group/')) return null

  const group = pathname.replace('/main/group/', '')

  try {
    return decodeURIComponent(group)
  } catch {
    return group
  }
}
