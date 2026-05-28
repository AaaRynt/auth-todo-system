// components/features/group-edit.tsx
'use client'

import { Ellipsis, PencilLine, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@/components/ui'
import { playTrashSound } from '@/lib/play-trash-sound'
import type { TGroup } from '@/types/todo'

export function GroupEdit({
  group,
  isActive,
  onRename,
  onDelete,
}: {
  group: TGroup
  isActive: boolean
  onRename: (id: string, name: string) => Promise<TGroup>
  onDelete: (id: string) => Promise<number>
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const renameGroup: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()

    const nextName = name.trim()

    if (!nextName || nextName === group.name || isSaving) return

    setError('')
    setIsSaving(true)

    try {
      const updatedGroup = await onRename(group.id, nextName)

      setRenameOpen(false)
      toast.success('Group renamed', { position: 'top-center' })

      if (isActive) {
        router.replace(`/main/group/${encodeURIComponent(updatedGroup.name)}`)
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to rename group.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteGroup = async () => {
    setIsDeleting(true)

    try {
      const movedTodoCount = await onDelete(group.id)
      playTrashSound()
      setDeleteOpen(false)
      toast.info(getDeleteToastMessage(movedTodoCount), { position: 'top-center' })

      if (isActive) {
        router.replace('/main/group/Inbox')
      }
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Unable to delete group.', {
        position: 'top-center',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Manage ${group.name}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setName(group.name)
              setError('')
              setMenuOpen(false)
              setRenameOpen(true)
            }}
          >
            <PencilLine aria-hidden="true" />
            Rename
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive w-full justify-start"
            onClick={() => {
              setMenuOpen(false)
              setDeleteOpen(true)
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open)
          if (!open) setError('')
        }}
      >
        <DialogContent>
          <form className="space-y-4" onSubmit={renameGroup}>
            <DialogHeader>
              <DialogTitle>Rename group</DialogTitle>
              <DialogDescription>Change the group name for every task in this group.</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`rename-${group.id}`}>Name</FieldLabel>
              <Input
                id={`rename-${group.id}`}
                name="groupName"
                value={name}
                maxLength={50}
                disabled={isSaving}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                required
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || !name.trim() || name.trim() === group.name}>
                {isSaving ? <Spinner /> : null}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete <em className="text-lg italic">{group.name}</em>?
            </DialogTitle>
            <DialogDescription>{getDeleteDescription(group.todoCount)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void deleteGroup()}>
              {isDeleting ? <Spinner /> : <Trash2 aria-hidden="true" />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getDeleteDescription(todoCount: number) {
  if (todoCount === 0) {
    return 'This empty group will be permanently deleted. This action cannot be undone.'
  }

  const label = todoCount === 1 ? 'todo' : 'todos'

  return `${todoCount} ${label} will be moved to Inbox before this group is deleted. This action cannot be undone.`
}

function getDeleteToastMessage(todoCount: number) {
  if (todoCount === 0) return 'Empty group deleted.'

  const label = todoCount === 1 ? 'todo' : 'todos'

  return `Group deleted. ${todoCount} ${label} moved to Inbox.`
}
