// components/features/group-edit.tsx
'use client'

import { Trash2 } from 'lucide-react'
import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { playTrashSound } from '@/lib/play-trash-sound'

export function GroupEdit() {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <Ellipsis />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Rename...
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            playTrashSound()
            setOpen(false)
          }}
        >
          <Trash2 />
          Delete
        </Button>
      </PopoverContent>
    </Popover>
  )
}
