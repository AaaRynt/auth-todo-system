// components/auth-guard.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '@/components/auth-guard'
import { createDeferred, jsonResponse } from '@/tests/frontend/test-helpers'

const navigation = vi.hoisted(() => ({ pathname: '/', router: { replace: vi.fn() } }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation.router }))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  navigation.router.replace.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('AuthGuard', () => {
  it.each(['/', '/auth', '/auth/signup'])('shows public route %s without an auth request', (pathname) => {
    navigation.pathname = pathname
    render(
      <AuthGuard>
        <p>Public content</p>
      </AuthGuard>,
    )
    expect(screen.getByText('Public content')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides private content until authorization succeeds', async () => {
    navigation.pathname = '/main'
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    render(
      <AuthGuard>
        <p>Private content</p>
      </AuthGuard>,
    )
    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', { credentials: 'same-origin' })
    await act(async () => {
      pending.resolve(jsonResponse({ user: { id: 'user-a' } }))
    })
    expect(await screen.findByText('Private content')).toBeInTheDocument()
  })

  it.each(['unauthorized', 'network'])(
    'redirects to login and keeps private content hidden on %s failure',
    async (failure) => {
      navigation.pathname = '/main'
      if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
      else fetchMock.mockResolvedValueOnce(jsonResponse({ user: null }, 401))
      render(
        <AuthGuard>
          <p>Private content</p>
        </AuthGuard>,
      )
      await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith('/auth'))
      expect(screen.queryByText('Private content')).not.toBeInTheDocument()
    },
  )

  it('ignores an old authorization result after navigating to another private route', async () => {
    navigation.pathname = '/main'
    const oldRequest = createDeferred<Response>()
    const newRequest = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const { rerender } = render(
      <AuthGuard>
        <p>Private content</p>
      </AuthGuard>,
    )
    navigation.pathname = '/main/todo'
    rerender(
      <AuthGuard>
        <p>Private content</p>
      </AuthGuard>,
    )
    await act(async () => {
      oldRequest.resolve(jsonResponse({ user: null }, 401))
    })
    expect(navigation.router.replace).not.toHaveBeenCalled()
    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
    await act(async () => {
      newRequest.resolve(jsonResponse({ user: { id: 'user-a' } }))
    })
    expect(await screen.findByText('Private content')).toBeInTheDocument()
  })
})
