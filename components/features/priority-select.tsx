// components/features/priority-select.tsx
'use client'

import { priorityOptions } from '@/app/data/const'
import type { Priority } from '@/app/data/type'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function PrioritySelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: Priority
  onChange: (priority: Priority) => void
}) {
  const selected = priorityOptions.find((item) => item.value === value) ?? priorityOptions[1]

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as Priority)}>
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
