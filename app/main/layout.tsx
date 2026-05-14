// app/main/layout.tsx
'use client'

import { Folder, ListChecks, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { TAuthUser } from '@/app/data/type'
import { NewGroupDialog } from '@/app/main/todo/new-group-dialog'
import { TodoProvider, useTodoContext } from '@/app/main/todo/todo-provider'
import { Account, Group, GroupEdit } from '@/components/features/'
import { Input, buttonVariants } from '@/components/ui/'
import { cn } from '@/lib/utils'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TAuthUser>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const response = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      }).catch(() => null)
      const data = response?.ok ? ((await response.json()) as { user: NonNullable<TAuthUser> }) : null

      if (cancelled) return

      setUser(data?.user ?? null)

      if (data?.user.username && window.sessionStorage.getItem('main-welcome-shown') !== 'true') {
        window.sessionStorage.setItem('main-welcome-shown', 'true')
        toast.info(`welcome,${data.user.username}`, { position: 'top-center' })
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
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

function Aside({ user }: { user: TAuthUser }) {
  const pathname = usePathname()
  const { todos, groups, search, setSearch, createGroup } = useTodoContext()
  const activeGroup = getActiveGroup(pathname)
  const groupTodoCounts = useMemo(
    () =>
      todos.reduce<Record<string, number>>((counts, todo) => {
        counts[todo.group] = (counts[todo.group] ?? 0) + 1
        return counts
      }, {}),
    [todos],
  )

  return (
    <aside className="bg-card/50 sticky top-14 flex h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col border-r px-2 py-3">
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
        <NewGroupDialog groups={groups} onCreateGroup={createGroup} />
        <hr />
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
                    'text-card-foreground w-full justify-between',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground absolute flex w-4 translate-x-0.5 items-center justify-center text-[0.5rem]">
                      {groupTodoCounts[group] ?? 0}
                    </div>
                    <Folder className="size-5" aria-hidden="true" />
                    <span className="truncate">{group}</span>
                  </div>
                  <GroupEdit />
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      <hr />
      <Account user={user} />
    </aside>
  )
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
