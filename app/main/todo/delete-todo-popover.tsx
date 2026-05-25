// app/main/todo/delete-todo-popover.tsx
'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Ttodo } from '@/app/data/type'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Spinner,
} from '@/components/ui/'
import { playTrashSound } from '@/lib/play-trash-sound'

export function DeleteTodoPopover({ todo, onDelete }: { todo: Ttodo; onDelete: (id: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteTodo = async () => {
    setIsDeleting(true)

    try {
      await onDelete(todo.id)
      playTrashSound()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete todo.', { position: 'top-center' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete todo"
          className="hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="left" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Delete this todo?</PopoverTitle>
          <PopoverDescription>
            <span>
              This will permanently remove &quot;<u className="text-primary">{todo.title}</u>&quot; from your tasks.
              <span className="text-destructive">This action cannot be undone.</span>
            </span>
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={() => void deleteTodo()}>
            {isDeleting ? <Spinner /> : null}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
