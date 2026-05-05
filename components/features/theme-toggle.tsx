// components/features/theme-toggle.tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
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
