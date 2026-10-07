// app/main/layout.test.tsx
// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MainLayout from '@/app/main/layout'
import { TodoPage } from '@/app/main/todo/todo-page'
import { groups, jsonResponse, todos } from '@/tests/frontend/test-helpers'
import type { TGroup } from '@/types/todo'

const navigation = vi.hoisted(() => ({
  pathname: '/main/all',
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
}))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation.router }))
// The header theme picker needs a theme provider; it does not participate in these navigation tests.
vi.mock('@/components/features/theme', () => ({ Theme: () => null }))
vi.mock('@/lib/play-trash-sound', () => ({ playTrashSound: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  navigation.pathname = '/main/all'
  navigation.router.push.mockReset()
  navigation.router.replace.mockReset()
  navigation.router.refresh.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function primeRequests(initialGroups: TGroup[] = groups) {
  fetchMock.mockImplementation(async (input) => {
    if (input === '/api/todos') return jsonResponse({ todos })
    if (input === '/api/groups') return jsonResponse({ groups: initialGroups })
    if (input === '/api/auth/me') return jsonResponse({ user: { id: 'user-a', username: 'ryan', nickname: 'Ryan' } })
    throw new Error(`Unexpected request: ${String(input)}`)
  })
}

function mountLayout() {
  return render(
    <MainLayout>
      <TodoPage />
    </MainLayout>,
  )
}

async function sidebar() {
  const navigation = within(screen.getByRole('navigation', { name: 'Todo navigation' }))
  await navigation.findByRole('link', { name: /Work$/ })
  return navigation
}

describe('MainLayout connections', () => {
  it('filters the real task list using the sidebar search input', async () => {
    primeRequests()
    mountLayout()
    await screen.findByText('Write tests')
    const user = userEvent.setup()
    const search = screen.getByRole('textbox', { name: 'Search todos by title' })
    await user.type(search, '  WRITE  ')
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.queryByText('Read docs')).not.toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    await user.clear(search)
    expect(screen.getByText('Read docs')).toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each(['Work', '工作 / Plans & ideas'])(
    'highlights the current group %s and uses an encoded link',
    async (name) => {
      const current = { id: 'current', name, todoCount: 4 }
      navigation.pathname = `/main/group/${encodeURIComponent(name)}`
      primeRequests([groups[1], current])
      mountLayout()
      const nav = within(screen.getByRole('navigation', { name: 'Todo navigation' }))
      const link = await nav.findByRole('link', { name: (accessibleName) => accessibleName.endsWith(name) })
      expect(link).toHaveAttribute('href', `/main/group/${encodeURIComponent(name)}`)
      expect(link).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'All Tasks' })).not.toHaveAttribute('aria-current')
      expect(nav.getByRole('link', { name: /Inbox$/ })).not.toHaveAttribute('aria-current')
      expect(link).toHaveTextContent('4')
    },
  )

  it('highlights All Tasks on its route without marking a group active', async () => {
    primeRequests()
    mountLayout()
    const nav = await sidebar()
    expect(nav.getByRole('link', { name: 'All Tasks' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: /Work$/ })).not.toHaveAttribute('aria-current')
    expect(nav.getByRole('link', { name: /Inbox$/ })).not.toHaveAttribute('aria-current')
  })

  it.each(['Inbox', 'iNbOx'])('hides the management entry for protected group %s', async (name) => {
    primeRequests([groups[0], { ...groups[1], name }])
    mountLayout()
    const nav = await sidebar()
    expect(nav.queryByRole('button', { name: `Manage ${name}` })).not.toBeInTheDocument()
    expect(nav.getByRole('button', { name: 'Manage Work' })).toBeEnabled()
  })

  it.each(['/main/groupWork', '/main/group/%E0%A4%A'])(
    'does not mark an unrelated or malformed route %s active',
    async (pathname) => {
      navigation.pathname = pathname
      primeRequests()
      mountLayout()
      const nav = await sidebar()
      for (const link of nav.getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')
    },
  )

  it('wires the active sidebar group to rename navigation and updated task labels', async () => {
    navigation.pathname = '/main/group/Work'
    primeRequests()
    mountLayout()
    const nav = await sidebar()
    const user = userEvent.setup()
    await user.click(nav.getByRole('button', { name: 'Manage Work' }))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Personal / 工作')
    fetchMock.mockResolvedValueOnce(jsonResponse({ group: { ...groups[0], name: 'Personal / 工作' } }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(navigation.router.replace).toHaveBeenCalledWith(`/main/group/${encodeURIComponent('Personal / 工作')}`),
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/groups/work',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Personal / 工作' }),
      }),
    )
    expect(nav.getByRole('link', { name: /Personal \/ 工作$/ })).toHaveTextContent('2')
    expect(screen.getByRole('heading', { name: 'Personal / 工作', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Work', level: 2 })).not.toBeInTheDocument()
    expect(screen.getByText('Write tests')).toBeInTheDocument()
  })

  it('deletes the active sidebar group, moves visible tasks to Inbox and navigates there', async () => {
    navigation.pathname = '/main/group/Work'
    primeRequests()
    mountLayout()
    const nav = await sidebar()
    const user = userEvent.setup()
    await user.click(nav.getByRole('button', { name: 'Manage Work' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ destinationGroup: { ...groups[1], todoCount: 3 }, movedTodoCount: 2 }),
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith('/main/group/Inbox'))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/groups/work', expect.objectContaining({ method: 'DELETE' }))
    expect(nav.queryByRole('link', { name: /Work$/ })).not.toBeInTheDocument()
    expect(nav.getByRole('link', { name: /Inbox$/ })).toHaveTextContent('3')
    expect(screen.queryByRole('heading', { name: 'Work', level: 2 })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inbox', level: 2 })).toBeInTheDocument()
    for (const todo of todos) expect(screen.getByText(todo.title)).toBeInTheDocument()
  })

  it('shows sidebar request errors and reloads both groups and tasks through Retry', async () => {
    let failGroups = true
    primeRequests()
    const ordinaryResponse = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) => {
      if (input === '/api/groups' && failGroups) {
        failGroups = false
        throw new Error('Groups offline')
      }
      return ordinaryResponse(input, init)
    })
    mountLayout()
    const nav = within(screen.getByRole('navigation', { name: 'Todo navigation' }))
    expect(await nav.findByText('Groups offline')).toBeInTheDocument()
    await userEvent.setup().click(nav.getByRole('button', { name: 'Retry' }))
    expect(await nav.findByRole('link', { name: /Work$/ })).toBeInTheDocument()
    expect(nav.queryByText('Groups offline')).not.toBeInTheDocument()
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([input]) => input === '/api/todos')).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([input]) => input === '/api/groups')).toHaveLength(2)
  })
})
