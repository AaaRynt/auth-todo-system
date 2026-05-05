// components/features/theme-toggle.tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme(),
    Icon = resolvedTheme === 'dark' ? Sun : Moon

  return (
    <Button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} size="icon-lg" variant="outline">
      <Icon />
    </Button>
  )
}
