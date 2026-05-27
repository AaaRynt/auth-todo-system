// app/main/layout.tsx
'use client'

import { Folder, ListChecks, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { defaultGroup } from '@/app/data/const'
import type { TAuthUser } from '@/app/data/type'
import { NewGroupDialog } from '@/app/main/todo/new-group-dialog'
import { TodoProvider, useTodoContext } from '@/app/main/todo/todo-provider'
import { Account, GroupBtn, GroupEdit, Theme } from '@/components/features'
import { Button, Input, Spinner, buttonVariants } from '@/components/ui'
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

      if (data?.user.nickname && window.sessionStorage.getItem('main-welcome-shown') !== 'true') {
        window.sessionStorage.setItem('main-welcome-shown', 'true')
        toast.info(`Welcome, ${data.user.nickname}`, { position: 'top-center' })
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
          <Aside user={user} setUser={setUser} />
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
      <Theme />
      <GroupBtn />
    </header>
  )
}

function Aside({ user, setUser }: { user: TAuthUser; setUser: (user: TAuthUser) => void }) {
  const pathname = usePathname()
  const { groups, search, isLoading, loadError, setSearch, reload, createGroup, renameGroup, deleteGroup } =
    useTodoContext()
  const activeGroup = getActiveGroup(pathname)

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
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-sm">
                <Spinner />
                Loading...
              </div>
            ) : loadError ? (
              <div className="flex flex-col gap-2 px-3 py-2">
                <p className="text-destructive text-xs">{loadError}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void reload()}>
                  Retry
                </Button>
              </div>
            ) : (
              groups.map((group) => {
                const active = activeGroup === group.name

                return (
                  <div key={group.id} className="flex items-center gap-1">
                    <Link
                      href={`/main/group/${encodeURIComponent(group.name)}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
                        'text-card-foreground min-w-0 flex-1 justify-start gap-2',
                      )}
                    >
                      <div className="text-muted-foreground absolute flex w-4 translate-x-0.5 items-center justify-center text-[0.5rem]">
                        {group.todoCount}
                      </div>
                      <Folder className="size-5" aria-hidden="true" />
                      <span className="truncate">{group.name}</span>
                    </Link>
                    {group.name.toLowerCase() !== defaultGroup.toLowerCase() ? (
                      <GroupEdit group={group} isActive={active} onRename={renameGroup} onDelete={deleteGroup} />
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </nav>
      <hr />
      <Account user={user} setUser={setUser} />
    </aside>
  )
}

function getActiveGroup(pathname: string) {
  if (!pathname.startsWith('/main/group')) return null

  const group = pathname.replace('/main/group', '')

  try {
    return decodeURIComponent(group)
  } catch {
    return group
  }
}
