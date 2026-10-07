// components/features/cookie-notice.test.tsx
// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CookieNotice } from '@/components/features/cookie-notice'

const storageKey = 'auth-todo-cookie-notice-accepted'

describe('CookieNotice', () => {
  it('shows on the first visit, stores acceptance and hides after Got it', async () => {
    const user = userEvent.setup()
    render(<CookieNotice />)
    expect(await screen.findByRole('status', { name: 'Cookie notice' })).toHaveTextContent('necessary cookies')
    await user.click(screen.getByRole('button', { name: 'Got it' }))
    expect(window.localStorage.getItem(storageKey)).toBe('true')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('stays hidden on a later visit when already accepted', async () => {
    window.localStorage.setItem(storageKey, 'true')
    render(<CookieNotice />)
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('still shows when reading browser storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    render(<CookieNotice />)
    expect(await screen.findByRole('status', { name: 'Cookie notice' })).toBeInTheDocument()
  })

  it('can dismiss the notice even when saving acceptance is blocked', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    render(<CookieNotice />)
    await screen.findByRole('status', { name: 'Cookie notice' })
    await user.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
