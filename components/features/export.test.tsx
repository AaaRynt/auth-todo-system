// components/features/export.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoProvider } from '@/app/main/todo/todo-provider'
import { Export } from '@/components/features/export'
import { createDeferred, groups, jsonResponse, todos } from '@/tests/frontend/test-helpers'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const fetchMock = vi.fn<typeof fetch>()
const createObjectURL = vi.fn<(blob: Blob) => string>()
const revokeObjectURL = vi.fn<(url: string) => void>()
const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
const downloads = vi.fn<(link: { href: string; download: string }) => void>()
beforeEach(() => {
  fetchMock.mockReset()
  createObjectURL.mockReset().mockReturnValue('blob:auth-todo-export')
  revokeObjectURL.mockReset()
  downloads.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads({ href: this.href, download: this.download })
  })
})
afterEach(() => {
  if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate)
  else Reflect.deleteProperty(URL, 'createObjectURL')
  if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke)
  else Reflect.deleteProperty(URL, 'revokeObjectURL')
})

function mountExport() {
  render(
    <TodoProvider>
      <Export />
    </TodoProvider>,
  )
  return screen.getByRole('button', { name: 'Export todos as JSON' })
}

async function loadExport(initialTodos = todos, initialGroups = groups) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ todos: initialTodos }))
    .mockResolvedValueOnce(jsonResponse({ groups: initialGroups }))
  const button = mountExport()
  // User-visible enabled state ensures the real provider has finished loading.
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

function readBlob(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('Export JSON', () => {
  it('disables download while loading and enables it when data is ready', async () => {
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(jsonResponse({ groups }))
    const button = mountExport()
    expect(button).toBeDisabled()
    await userEvent.setup().click(button)
    expect(createObjectURL).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve(jsonResponse({ todos }))
    })
    expect(button).toBeEnabled()
  })

  it('disables download when data loading fails', async () => {
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(jsonResponse({ groups }))
    const button = mountExport()
    await act(async () => {
      pending.reject(new Error('Offline'))
    })
    expect(button).toBeDisabled()
    await userEvent.setup().click(button)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('exports all task fields with Unix seconds, omits group counts and releases the download URL', async () => {
    const fixedNow = Date.parse('2026-10-07T12:34:56.789Z')
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow)
    const source = [{ ...todos[0], createdAt: 1999, updatedAt: '2026-10-07T00:00:00.999Z' }, todos[1]]
    const button = await loadExport(source)
    await userEvent.setup().click(button)
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('application/json')
    const exportedAt = Math.floor(fixedNow / 1000)
    expect(JSON.parse(await readBlob(blob))).toEqual({
      exportedAt,
      groups: [
        { id: 'inbox', name: 'Inbox' },
        { id: 'work', name: 'Work' },
      ],
      todos: [
        { ...source[0], createdAt: 1, updatedAt: Math.floor(Date.parse(source[0].updatedAt) / 1000) },
        { ...source[1], createdAt: 0, updatedAt: Math.floor(Date.parse(source[1].updatedAt) / 1000) },
      ],
    })
    expect(downloads).toHaveBeenCalledExactlyOnceWith({
      href: 'blob:auth-todo-export',
      download: `auth-todo-export-${exportedAt}.json`,
    })
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:auth-todo-export')
    expect(downloads.mock.invocationCallOrder[0]).toBeLessThan(revokeObjectURL.mock.invocationCallOrder[0])
    expect(toast.success).toHaveBeenCalledWith('Todos exported', { position: 'top-center' })
    expect(source[0].createdAt).toBe(1999)
  })

  it('downloads a valid empty export', async () => {
    const button = await loadExport([], [])
    await userEvent.setup().click(button)
    const data = JSON.parse(await readBlob(createObjectURL.mock.calls[0][0]))
    expect(data).toEqual({ exportedAt: expect.any(Number), groups: [], todos: [] })
    expect(downloads).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('shows failure feedback if URL creation fails and does not attempt a download', async () => {
    const button = await loadExport()
    createObjectURL.mockImplementationOnce(() => {
      throw new Error('URL creation failed')
    })
    await userEvent.setup().click(button)
    expect(toast.error).toHaveBeenCalledWith('Unable to export todos.', { position: 'top-center' })
    expect(toast.success).not.toHaveBeenCalled()
    expect(downloads).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    expect(button).toBeEnabled()
  })

  it('releases the created URL even when starting the download throws, and allows retry', async () => {
    const button = await loadExport()
    downloads.mockImplementationOnce(() => {
      throw new Error('Download blocked')
    })
    await userEvent.setup().click(button)
    expect(toast.error).toHaveBeenCalledWith('Unable to export todos.', { position: 'top-center' })
    expect(toast.success).not.toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:auth-todo-export')
    expect(button).toBeEnabled()
    await userEvent.setup().click(button)
    expect(toast.success).toHaveBeenCalledWith('Todos exported', { position: 'top-center' })
    expect(revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
