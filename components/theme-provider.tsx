'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = Exclude<Theme, 'system'>

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: 'class'
  defaultTheme?: Theme
  disableTransitionOnChange?: boolean
  enableSystem?: boolean
  storageKey?: string
}

type ThemeProviderState = {
  resolvedTheme?: ResolvedTheme
  setTheme: (theme: Theme) => void
  systemTheme?: ResolvedTheme
  theme: Theme
  themes: Theme[]
}

const ThemeProviderContext = React.createContext<ThemeProviderState | null>(null)
const themeStorageEvent = 'theme-storage'

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme, enableSystem: boolean, disableTransitionOnChange: boolean) {
  const resolvedTheme = theme === 'system' && enableSystem ? getSystemTheme() : theme
  const root = document.documentElement
  let removeTransitionStyle: (() => void) | undefined

  if (disableTransitionOnChange) {
    const style = document.createElement('style')
    style.appendChild(
      document.createTextNode('*,*::before,*::after{transition:none!important;animation:none!important}'),
    )
    document.head.appendChild(style)
    removeTransitionStyle = () => {
      window.getComputedStyle(document.body)
      setTimeout(() => document.head.removeChild(style), 1)
    }
  }

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme
  removeTransitionStyle?.()
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  disableTransitionOnChange = false,
  enableSystem = true,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const theme = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) => {
        const handleStorage = (event: StorageEvent) => {
          if (event.key === storageKey) onStoreChange()
        }

        window.addEventListener('storage', handleStorage)
        window.addEventListener(themeStorageEvent, onStoreChange)

        return () => {
          window.removeEventListener('storage', handleStorage)
          window.removeEventListener(themeStorageEvent, onStoreChange)
        }
      },
      [storageKey],
    ),
    React.useCallback(() => {
      const storedTheme = window.localStorage.getItem(storageKey)
      return isTheme(storedTheme) ? storedTheme : defaultTheme
    }, [defaultTheme, storageKey]),
    React.useCallback(() => defaultTheme, [defaultTheme]),
  )

  const systemTheme = React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      mediaQuery.addEventListener('change', onStoreChange)

      return () => mediaQuery.removeEventListener('change', onStoreChange)
    }, []),
    getSystemTheme,
    () => undefined,
  )

  React.useEffect(() => {
    applyTheme(theme, enableSystem, disableTransitionOnChange)
  }, [disableTransitionOnChange, enableSystem, systemTheme, theme])

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      window.localStorage.setItem(storageKey, nextTheme)
      window.dispatchEvent(new Event(themeStorageEvent))
    },
    [storageKey],
  )

  const value = React.useMemo<ThemeProviderState>(
    () => ({
      resolvedTheme: theme === 'system' ? systemTheme : theme,
      setTheme,
      systemTheme,
      theme,
      themes: enableSystem ? ['light', 'dark', 'system'] : ['light', 'dark'],
    }),
    [enableSystem, setTheme, systemTheme, theme],
  )

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
