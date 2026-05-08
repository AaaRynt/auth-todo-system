// app/main/todo/delete-todo-popover.tsx
'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Ttodo } from '@/app/data/type'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/'

const trashSoundSrc = '/audio/drag%20to%20trash.mp3'

export function DeleteTodoPopover({ todo, onDelete }: { todo: Ttodo; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false)

  const playTrashSound = () => {
    const audio = new Audio(trashSoundSrc)

    void audio.play().catch(() => {
      // Browsers may block audio in some contexts; deletion should still proceed.
    })
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
              This will permanently remove &quot;<u className="text-primary">{todo.title}</u>&quot; from local storage.
              <span className="text-destructive">This action cannot be undone.</span>
            </span>
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              playTrashSound()
              onDelete(todo.id)
              setOpen(false)
            }}
          >
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
