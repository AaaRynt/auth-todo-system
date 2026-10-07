// app/auth/auth-forms.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '@/app/auth/login'
import { Signup } from '@/app/auth/signup'
import { createDeferred, jsonResponse } from '@/tests/frontend/test-helpers'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  router.push.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const forms = [
  {
    label: 'Login',
    Component: Login,
    endpoint: '/api/auth/login',
    pending: 'Logging in',
    switchLabel: 'Sign up',
    fallback: 'Login failed.',
  },
  {
    label: 'Sign up',
    Component: Signup,
    endpoint: '/api/auth/register',
    pending: 'Signing up',
    switchLabel: 'Login',
    fallback: 'Sign up failed.',
  },
]

for (const form of forms) {
  describe(`${form.label} form`, () => {
    function mountForm() {
      const onSwitch = vi.fn()
      const onUsernameChange = vi.fn()
      render(<form.Component onSwitch={onSwitch} onUsernameChange={onUsernameChange} />)
      return { onSwitch, onUsernameChange }
    }

    async function fillForm() {
      const user = userEvent.setup()
      await user.type(screen.getByRole('textbox', { name: 'Username' }), ' ryan ')
      await user.type(screen.getByLabelText('Password', { exact: true }), ' Password123 ')
      if (form.label === 'Sign up') {
        await user.type(screen.getByLabelText('Confirm Password', { exact: true }), ' Password123 ')
        await user.click(screen.getByRole('checkbox', { name: 'Accept' }))
      }
      return user
    }

    it('disables submission for an empty form and switches forms without a request', async () => {
      const { onSwitch } = mountForm()
      expect(screen.getByRole('button', { name: form.label })).toBeDisabled()
      await userEvent.setup().click(screen.getByRole('button', { name: form.switchLabel }))
      expect(onSwitch).toHaveBeenCalledOnce()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('blocks duplicate submissions, sends trimmed username and preserves password, then navigates', async () => {
      const { onUsernameChange } = mountForm()
      const user = await fillForm()
      const pending = createDeferred<Response>()
      fetchMock.mockReturnValueOnce(pending.promise)
      window.sessionStorage.setItem('main-welcome-shown', 'true')
      await user.click(screen.getByRole('button', { name: form.label }))
      const button = screen.getByRole('button', { name: new RegExp(form.pending) })
      expect(button).toBeDisabled()
      expect(screen.queryByRole('button', { name: form.switchLabel })).not.toBeInTheDocument()
      await user.click(button)
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(form.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username: 'ryan', password: ' Password123 ' }),
      })
      expect(onUsernameChange).toHaveBeenLastCalledWith(' ryan ')
      expect(router.push).not.toHaveBeenCalled()
      await act(async () => {
        pending.resolve(jsonResponse({ user: { id: 'user-a' } }))
      })
      await waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith('/main'))
      expect(window.sessionStorage.getItem('main-welcome-shown')).toBeNull()
    })

    it.each(['network', 'http', 'invalid-json'])(
      'shows a %s error, restores submission and clears feedback when editing',
      async (failure) => {
        mountForm()
        const user = await fillForm()
        if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Offline'))
        else if (failure === 'http')
          fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Credentials rejected.' }, 401))
        else fetchMock.mockResolvedValueOnce(new Response('invalid-json', { status: 500 }))
        await user.click(screen.getByRole('button', { name: form.label }))
        const message =
          failure === 'network'
            ? 'Unable to reach the server. Please try again.'
            : failure === 'http'
              ? 'Credentials rejected.'
              : form.fallback
        expect(await screen.findByRole('alert')).toHaveTextContent(message)
        expect(screen.getByRole('button', { name: form.label })).toBeEnabled()
        expect(router.push).not.toHaveBeenCalled()
        expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAttribute('aria-invalid', 'true')
        await user.type(screen.getByRole('textbox', { name: 'Username' }), 'x')
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAttribute('aria-invalid', 'false')
      },
    )

    it('toggles password visibility without submitting', async () => {
      mountForm()
      const user = userEvent.setup()
      const password = screen.getByLabelText('Password', { exact: true })
      expect(password).toHaveAttribute('type', 'password')
      await user.click(screen.getAllByRole('button', { name: 'Show password' })[0])
      expect(password).toHaveAttribute('type', 'text')
      await user.click(screen.getAllByRole('button', { name: 'Hide password' })[0])
      expect(password).toHaveAttribute('type', 'password')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
}

describe('Signup client validation', () => {
  it('requires terms acceptance and matching confirmation before enabling submit', async () => {
    render(<Signup onSwitch={vi.fn()} onUsernameChange={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ryan')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'Password123')
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'Wrong123')
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }))
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
    expect(screen.getByLabelText('Confirm Password', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await user.clear(screen.getByLabelText('Confirm Password', { exact: true }))
    await user.type(screen.getByLabelText('Confirm Password', { exact: true }), 'Password123')
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }))
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['Aa123', 'lowercase123', 'UPPERCASE123', 'NoNumbers'])(
    'prevents registering with a weak password: %s',
    async (password) => {
      render(<Signup onSwitch={vi.fn()} onUsernameChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ryan')
      await user.type(screen.getByLabelText('Password', { exact: true }), password)
      await user.type(screen.getByLabelText('Confirm Password', { exact: true }), password)
      await user.click(screen.getByRole('checkbox', { name: 'Accept' }))
      expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()
      expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )
})
