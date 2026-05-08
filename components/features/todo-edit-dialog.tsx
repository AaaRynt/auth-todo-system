// components/features/todo-edit-dialog.tsx
'use client'

import { PencilLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Priority, Todo } from '@/app/data/type'
import { PrioritySelect } from '@/components/features/priority-select'
import { SearchableSelect } from '@/components/features/searchable-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export function TodoEditDialog({
  todo,
  groups,
  onUpdate,
}: {
  todo: Todo
  groups: string[]
  onUpdate: (id: string, updates: Partial<Pick<Todo, 'title' | 'group' | 'priority'>>) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(todo.title)
  const [group, setGroup] = useState(todo.group)
  const [priority, setPriority] = useState<Priority>(todo.priority)
  const groupOptions = useMemo(
    () =>
      groups.map((groupName) => ({
        value: groupName,
        label: groupName,
      })),
    [groups],
  )

  const resetDraft = () => {
    setTitle(todo.title)
    setGroup(todo.group)
    setPriority(todo.priority)
  }

  const save = () => {
    if (!title.trim()) return

    onUpdate(todo.id, {
      title,
      group,
      priority,
    })
    setOpen(false)
    toast.success('Todo updated', { position: 'top-center' })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetDraft()
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={todo.completed} aria-label="Edit todo">
          <PencilLine aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit todo</DialogTitle>
          <DialogDescription>Update the name, group, and priority for this active task.</DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 content-start gap-6">
          <div className="space-y-2">
            <label htmlFor={`todo-title-${todo.id}`} className="text-sm font-medium">
              Name
            </label>
            <Input
              id={`todo-title-${todo.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="px-4 text-4xl font-semibold"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              value={group}
              options={groupOptions}
              placeholder="Group"
              allowCustom
              onChange={setGroup}
            />

            <PrioritySelect value={priority} onChange={setPriority} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={save} disabled={!title.trim()}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
