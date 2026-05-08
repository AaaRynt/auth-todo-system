// components/features/searchable-select.tsx
'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/'
import { cn } from '@/lib/utils'

export type SearchableSelectOption = {
  value: string
  label: string
}

export function SearchableSelect({
  value,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  allowCustom = false,
  className,
  id,
  onChange,
  onSearch,
}: {
  value: string
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  allowCustom?: boolean
  className?: string
  id?: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedOption = options.find((option) => option.value === value)
  const displayValue = selectedOption?.label || value
  const normalizedSearch = search.trim().toLowerCase()
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options

    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch, options])
  const canCreate =
    allowCustom &&
    search.trim().length > 0 &&
    !options.some(
      (option) => option.label.toLowerCase() === normalizedSearch || option.value.toLowerCase() === normalizedSearch,
    )

  const selectValue = (nextValue: string) => {
    onChange(nextValue)
    setSearch('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-36 justify-between font-normal', !displayValue && 'text-muted-foreground', className)}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-2">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            onSearch?.(event.target.value)
          }}
          placeholder={searchPlaceholder}
        />
        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="hover:bg-muted flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm outline-none"
              onClick={() => selectValue(option.value)}
            >
              <span className="truncate">{option.label}</span>
              <Check
                className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')}
                aria-hidden="true"
              />
            </button>
          ))}
          {canCreate && (
            <>
              <hr className="my-2" />
              <button
                type="button"
                className="hover:bg-muted mt-1 flex w-full justify-center rounded-md px-3 py-2 text-left text-sm outline-none"
                onClick={() => selectValue(search.trim())}
              >
                <span>
                  Create &quot;<u className="text-primary">{search.trim()}</u>&quot;
                  <u></u>
                </span>
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
