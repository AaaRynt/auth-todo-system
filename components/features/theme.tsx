// components/features/theme.tsx
'use client'

import { Check, Moon, Palette, Sun } from 'lucide-react'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { type TThemePreset, defaultThemePresetId, themePresets } from '@/components/features/theme-presets'
import { useTheme } from '@/components/theme-provider'
import { Button, Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'

const themePresetStorageKey = 'auth-todo-theme-preset'
const themePresetStorageEvent = 'theme-preset-storage'

export function Theme() {
  const { resolvedTheme } = useTheme()
  const selectedPresetId = useThemePreset()
  const selectedPreset = useMemo(() => getThemePreset(selectedPresetId), [selectedPresetId])

  useEffect(() => {
    if (!resolvedTheme) return

    applyThemePreset(selectedPreset, resolvedTheme)
  }, [resolvedTheme, selectedPreset])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon-lg" aria-label="Change theme">
          <Palette aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[min(32rem,calc(100dvh-5rem))] w-80 overflow-y-auto" align="end">
        <PopoverHeader>
          <PopoverTitle>Change theme</PopoverTitle>
          <ThemeToggle />
        </PopoverHeader>
        <div className="grid gap-1">
          {themePresets.map((preset) => (
            <PresetOption key={preset.id} preset={preset} selected={preset.id === selectedPreset.id} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const checked = resolvedTheme === 'light'

  return (
    <div className="flex items-center gap-2">
      <Moon className={resolvedTheme === 'light' ? 'opacity-20' : ''} />
      <Switch
        aria-label="Toggle theme"
        checked={checked}
        disabled={!resolvedTheme}
        onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      />
      <Sun className={resolvedTheme === 'light' ? '' : 'opacity-20'} />
    </div>
  )
}

function PresetOption({ preset, selected }: { preset: TThemePreset; selected: boolean }) {
  return (
    <Button
      type="button"
      variant={selected ? 'secondary' : 'ghost'}
      className="h-auto justify-start gap-3 py-2"
      aria-pressed={selected}
      onClick={() => setThemePreset(preset.id)}
    >
      <ThemeSwatches preset={preset} />
      <span className="min-w-0 flex-1 truncate text-left">{formatPresetId(preset.id)}</span>
      <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
    </Button>
  )
}

function ThemeSwatches({ preset }: { preset: TThemePreset }) {
  return (
    <span className="flex shrink-0 overflow-hidden rounded-full border" aria-hidden="true">
      <span className="size-4" style={{ background: preset.lightTheme['--primary'] }} />
      <span className="size-4" style={{ background: preset.lightTheme['--accent'] }} />
      <span className="size-4" style={{ background: preset.darkTheme['--background'] }} />
    </span>
  )
}

function useThemePreset() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === themePresetStorageKey) onStoreChange()
      }

      window.addEventListener('storage', handleStorage)
      window.addEventListener(themePresetStorageEvent, onStoreChange)

      return () => {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(themePresetStorageEvent, onStoreChange)
      }
    },
    () => {
      const storedPreset = window.localStorage.getItem(themePresetStorageKey)

      return isThemePresetId(storedPreset) ? storedPreset : defaultThemePresetId
    },
    () => defaultThemePresetId,
  )
}

function setThemePreset(presetId: string) {
  window.localStorage.setItem(themePresetStorageKey, presetId)
  window.dispatchEvent(new Event(themePresetStorageEvent))
}

function getThemePreset(presetId: string) {
  return themePresets.find((preset) => preset.id === presetId) ?? themePresets[0]
}

function isThemePresetId(value: string | null): value is string {
  return value ? themePresets.some((preset) => preset.id === value) : false
}

function applyThemePreset(preset: TThemePreset, resolvedTheme: 'light' | 'dark') {
  const variables = resolvedTheme === 'dark' ? preset.darkTheme : preset.lightTheme
  const root = document.documentElement

  Object.entries(variables).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}

function formatPresetId(id: string) {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
