// app/main/todo/priority-select.tsx
'use client'

import { priorityOptions } from '@/app/main/todo/todo-options'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TPriority } from '@/types/todo'

export function PrioritySelect({
  id,
  name,
  className,
  value,
  onChange,
}: {
  id?: string
  name?: string
  className?: string
  value: TPriority
  onChange: (priority: TPriority) => void
}) {
  const selected = priorityOptions.find((item) => item.value === value) ?? priorityOptions[1]

  return (
    <Select name={name} value={value} onValueChange={(nextValue) => onChange(nextValue as TPriority)}>
      <SelectTrigger id={id} updown={true} className={cn('w-24', selected.className, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-0!">
        <SelectGroup>
          {priorityOptions.map((item) => (
            <SelectItem value={item.value} key={item.value} className={cn('pl-3!', item.className)}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
