// components/features/theme.tsx
'use client'

import { Moon, Palette, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button, Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui'

export function Theme() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg">
          <Palette />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <PopoverHeader>
          <PopoverTitle>Change theme</PopoverTitle>
          <ThemeToggle />
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const Icon = resolvedTheme === 'dark' ? Sun : Moon

  return (
    <Button
      aria-label="Toggle theme"
      disabled={!resolvedTheme}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      size="icon-lg"
      variant="outline"
    >
      <Icon />
    </Button>
  )
}
