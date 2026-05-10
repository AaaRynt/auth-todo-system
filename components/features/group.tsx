// components/features/group.tsx
'use client'

import { RiGithubFill } from '@remixicon/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Button, ButtonGroup } from '@/components/ui/'

export function Group() {
  return (
    <ButtonGroup className="hidden sm:flex">
      <ThemeToggle />
      <GitHub />
    </ButtonGroup>
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

function GitHub() {
  return (
    <Button asChild variant="outline" size="icon-lg">
      <a href="https://github.com/AaaRynt/auth-todo-system" target="_blank" rel="noreferrer">
        <RiGithubFill />
      </a>
    </Button>
  )
}
