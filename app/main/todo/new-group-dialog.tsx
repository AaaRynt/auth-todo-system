// app/main/todo/new-group-dialog.tsx
'use client'

import { SquarePen } from 'lucide-react'
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
  DialogTrigger,
  Field,
  FieldLabel,
  Input,
  Spinner,
} from '@/components/ui'
import type { TGroup } from '@/types/todo'

export function NewGroupDialog({
  groups,
  onCreateGroup,
}: {
  groups: TGroup[]
  onCreateGroup: (group: string) => Promise<TGroup>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const save = async () => {
    const nextName = name.trim()

    if (!nextName) return

    const existingGroup = groups.find((group) => group.name.toLowerCase() === nextName.toLowerCase())

    if (existingGroup) {
      setName('')
      setOpen(false)
      router.push(`/main/group/${encodeURIComponent(existingGroup.name)}`)
      toast.info('Group already exists', { position: 'top-center' })
      return
    }

    setIsCreating(true)

    try {
      const createdGroup = await onCreateGroup(nextName)

      setName('')
      setOpen(false)
      router.push(`/main/group/${encodeURIComponent(createdGroup.name)}`)
      toast.success('Group created', { position: 'top-center' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create group.', { position: 'top-center' })
    } finally {
      setIsCreating(false)
    }
  }
  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()
    await save()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setName('')
        if (!nextOpen) setIsCreating(false)
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start">
          <SquarePen aria-hidden="true" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>Create an empty todo group and open it in the sidebar.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="new-group-name">Name</FieldLabel>
            <Input
              id="new-group-name"
              name="groupName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="px-4"
              maxLength={50}
              autoFocus
              required
              disabled={isCreating}
            />
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isCreating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? <Spinner /> : null}
              {isCreating ? 'Creating...' : 'Create group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
