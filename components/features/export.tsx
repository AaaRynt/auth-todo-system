// components/features/export.tsx
'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import type { TGroup, Ttodo } from '@/app/data/type'
import { useTodoContext } from '@/app/main/todo/todo-provider'
import { Button } from '@/components/ui'

type TExportTodo = Omit<Ttodo, 'createdAt' | 'updatedAt'> & {
  createdAt: number
  updatedAt: number
}

type TExportData = {
  exportedAt: number
  groups: Array<Pick<TGroup, 'id' | 'name'>>
  todos: TExportTodo[]
}

export function Export() {
  const { todos, groups, isLoading, loadError } = useTodoContext()

  const downloadJson = () => {
    try {
      const data: TExportData = {
        exportedAt: toUnixTime(Date.now()),
        groups: groups.map((group) => ({
          id: group.id,
          name: group.name,
        })),
        todos: todos.map((todo) => ({
          ...todo,
          createdAt: toUnixTime(todo.createdAt),
          updatedAt: toUnixTime(todo.updatedAt),
        })),
      }
      const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')

      link.href = url
      link.download = `auth-todo-export-${data.exportedAt}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Todos exported', { position: 'top-center' })
    } catch {
      toast.error('Unable to export todos.', { position: 'top-center' })
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      title="Export todos as JSON"
      aria-label="Export todos as JSON"
      disabled={isLoading || !!loadError}
      onClick={downloadJson}
    >
      <Download aria-hidden="true" />
    </Button>
  )
}

function toUnixTime(value: number | string) {
  const date = typeof value === 'number' ? value : new Date(value).getTime()

  return Math.floor(date / 1000)
}
