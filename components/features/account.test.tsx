// components/features/account.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Account } from '@/components/features/account'
import { createDeferred, jsonResponse } from '@/tests/frontend/test-helpers'
import type { TSessionUser } from '@/types/auth'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const fetchMock = vi.fn<typeof fetch>()
const account: TSessionUser = {
  id: 'user-a',
  username: 'ryan',
  nickname: 'Ryan',
  createdAt: '2026-10-07T00:00:00.000Z',
}
beforeEach(() => {
  fetchMock.mockReset()
  router.replace.mockReset()
  router.refresh.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

async function openAccount() {
  const setUser = vi.fn()
  render(<Account user={account} setUser={setUser} />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Ryan/ }))
  return { user, setUser }
}

describe('Account dialogs', () => {
  it('saves a trimmed nickname after disabling unchanged values and pending submission', async () => {
    const { user, setUser } = await openAccount()
    await user.click(screen.getByRole('button', { name: 'Edit profile' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.clear(screen.getByRole('textbox', { name: 'Nickname' }))
    await user.type(screen.getByRole('textbox', { name: 'Nickname' }), ' New Name ')
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/auth/account',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ nickname: 'New Name' }) }),
    )
    const updated = { ...account, nickname: 'New Name' }
    await act(async () => {
      pending.resolve(jsonResponse({ user: updated }))
    })
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(updated))
    expect(screen.queryByRole('dialog', { name: 'Edit profile' })).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Hello, New Name', expect.any(Object))
  })

  it.each(['network', 'http', 'missing-user'])(
    'keeps the profile dialog open and restores Save on %s failure',
    async (failure) => {
      const { user, setUser } = await openAccount()
      await user.click(screen.getByRole('button', { name: 'Edit profile' }))
      await user.clear(screen.getByRole('textbox', { name: 'Nickname' }))
      await user.type(screen.getByRole('textbox', { name: 'Nickname' }), 'New')
      if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
      else
        fetchMock.mockResolvedValueOnce(
          jsonResponse(failure === 'http' ? { message: 'Profile rejected.' } : {}, failure === 'http' ? 400 : 200),
        )
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        failure === 'network'
          ? 'Unable to reach the server.'
          : failure === 'http'
            ? 'Profile rejected.'
            : 'Profile update failed.',
      )
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
      expect(setUser).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    },
  )

  it('requires matching new passwords, sends the update and clears sensitive inputs on success', async () => {
    const { user } = await openAccount()
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    await user.type(screen.getByLabelText('Current Password', { exact: true }), 'Current123')
    await user.type(screen.getByLabelText('New Password', { exact: true }), 'NewPassword123')
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'Wrong123')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.clear(screen.getByLabelText('Confirm Password', { exact: true }))
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'NewPassword123')
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/auth/password',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: 'Current123', newPassword: 'NewPassword123' }),
        credentials: 'same-origin',
      }),
    )
    for (const label of ['Current Password', 'New Password', 'Confirm Password'])
      expect(screen.getByLabelText(label, { exact: true })).toHaveValue('')
  })

  it('restores password submission and shows feedback after a network failure', async () => {
    const { user } = await openAccount()
    await user.click(screen.getByRole('button', { name: 'Change password' }))
    for (const [label, value] of [
      ['Current Password', 'Current123'],
      ['New Password', 'NewPassword123'],
      ['Confirm Password', 'NewPassword123'],
    ]) {
      await user.type(screen.getByLabelText(label, { exact: true }), value)
    }
    fetchMock.mockRejectedValueOnce(new Error('Offline'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server.')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(screen.getByLabelText('Current Password', { exact: true })).toHaveValue('Current123')
  })

  it('requires a confirmation password before deleting, blocks pending actions and navigates on success', async () => {
    const { user } = await openAccount()
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'Current123')
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    window.sessionStorage.setItem('main-welcome-shown', 'true')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(screen.getByRole('button', { name: /Deleting/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(router.replace).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve(jsonResponse({ ok: true }))
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/auth/account',
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ password: 'Current123' }) }),
    )
    expect(router.replace).toHaveBeenCalledWith('/auth')
    expect(router.refresh).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem('main-welcome-shown')).toBeNull()
  })

  it.each(['network', 'http'])('keeps the account deletion dialog open on %s failure', async (failure) => {
    const { user } = await openAccount()
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'Current123')
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
    else fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Password is incorrect.' }, 401))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      failure === 'network' ? 'Unable to reach the server.' : 'Password is incorrect.',
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('blocks pending logout and clears the welcome marker on success', async () => {
    const { user } = await openAccount()
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    window.sessionStorage.setItem('main-welcome-shown', 'true')
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByRole('button', { name: /Logging out/ })).toBeDisabled()
    await act(async () => {
      pending.resolve(jsonResponse({ ok: true }))
    })
    expect(router.replace).toHaveBeenCalledWith('/auth')
    expect(router.refresh).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem('main-welcome-shown')).toBeNull()
  })

  it.each(['network', 'http'])('shows a toast and restores logout after %s failure', async (failure) => {
    const { user } = await openAccount()
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
    else fetchMock.mockResolvedValueOnce(jsonResponse({}, 500))
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        failure === 'network' ? 'Unable to reach the server. Please try again.' : 'Logout failed. Please try again.',
        expect.any(Object),
      ),
    )
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
