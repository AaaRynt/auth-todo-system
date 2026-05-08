// app/main/todo/priority-select.tsx
'use client'

import { priorityOptions } from '@/app/data/const'
import type { Tpriority } from '@/app/data/type'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/'
import { cn } from '@/lib/utils'

export function PrioritySelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: Tpriority
  onChange: (priority: Tpriority) => void
}) {
  const selected = priorityOptions.find((item) => item.value === value) ?? priorityOptions[1]

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as Tpriority)}>
      <SelectTrigger id={id} updown={true} className={cn('w-24', selected.className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {priorityOptions.map((item) => (
            <SelectItem value={item.value} key={item.value} className={item.className}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
