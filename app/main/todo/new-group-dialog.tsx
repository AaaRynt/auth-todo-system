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
} from '@/components/ui/'

export function NewGroupDialog({
  groups,
  onCreateGroup,
}: {
  groups: string[]
  onCreateGroup: (group: string) => string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const save = () => {
    const nextName = name.trim()

    if (!nextName) return

    const existed = groups.some((group) => group.toLowerCase() === nextName.toLowerCase())
    const createdGroup = onCreateGroup(nextName)

    if (!createdGroup) return

    setName('')
    setOpen(false)
    router.push(`/main/group/${encodeURIComponent(createdGroup)}`)

    if (existed) {
      toast.info('Group already exists', { position: 'top-center' })
    } else {
      toast.success('Group created', { position: 'top-center' })
    }
  }
  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()
    save()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setName('')
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
              autoFocus
              required
            />
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
