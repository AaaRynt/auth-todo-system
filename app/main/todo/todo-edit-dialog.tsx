// app/main/todo/todo-edit-dialog.tsx
'use client'

import { PencilLine } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Tpriority, Ttodo } from '@/app/data/type'
import { PrioritySelect } from '@/app/main/todo/priority-select'
import { SearchableSelect } from '@/components/features/'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldLabel,
  Input,
} from '@/components/ui/'

export function TodoEditDialog({
  todo,
  groups,
  onUpdate,
}: {
  todo: Ttodo
  groups: string[]
  onUpdate: (id: string, updates: Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(todo.title)
  const [group, setGroup] = useState(todo.group)
  const [priority, setPriority] = useState<Tpriority>(todo.priority)
  const formId = useId()
  const titleId = `${formId}-title`
  const groupId = `${formId}-group`
  const priorityId = `${formId}-priority`
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
  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()
    save()
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

        <form className="grid flex-1 content-start gap-6" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor={titleId}>Name</FieldLabel>
            <Input
              id={titleId}
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="px-4 text-4xl font-semibold"
              autoFocus
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={groupId}>Group</FieldLabel>
              <SearchableSelect
                id={groupId}
                value={group}
                options={groupOptions}
                placeholder="Group"
                allowCustom
                className="w-full"
                onChange={setGroup}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={priorityId}>Priority</FieldLabel>
              <PrioritySelect
                id={priorityId}
                name="priority"
                className="w-full"
                value={priority}
                onChange={setPriority}
              />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!title.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
