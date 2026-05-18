// components/features/account.tsx
'use client'

import { Eye, EyeOff, LogOut, UserCircle, UserRoundKey, UserRoundX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import type { TAuthUser } from '@/app/data/type'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@/components/ui/'

export function Account({ user }: { user: TAuthUser }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground mt-1 h-auto w-full justify-start gap-3 border-t px-3 py-2 text-sm"
        >
          <UserCircle className="size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-left">
            <div className="text-card-foreground truncate font-medium">{user?.username}</div>
            <div className="truncate text-xs">{user ? getUserAgeDays(user.createdAt) : ''}</div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <ChangePasswordField />
        <Logout />
        <Deactivate user={user} />
      </PopoverContent>
    </Popover>
  )
}

function ChangePasswordField() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passwordMeetsPolicy =
    newPassword.length >= 6 && /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) && /\d/.test(newPassword)
  const canSubmit =
    currentPassword.length > 0 &&
    passwordMeetsPolicy &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !isSubmitting

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const response = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    })
    const data = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setError(data?.message ?? 'Password update failed.')
      setIsSubmitting(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Password updated.')
    setIsSubmitting(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          setShowPassword(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setError('')
          setSuccess('')
          setIsSubmitting(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserRoundKey />
          Change password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-12"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  setError('')
                  setSuccess('')
                }}
                required
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2!"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="new-password">New Password</FieldLabel>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-12"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setError('')
                  setSuccess('')
                }}
                aria-invalid={newPassword.length > 0 && !passwordMeetsPolicy}
                required
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2!"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              At least 6 characters with uppercase letters, lowercase letters, and numbers.
            </p>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-12"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setError('')
                  setSuccess('')
                }}
                aria-invalid={newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword}
                required
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2!"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {success ? <p className="text-muted-foreground text-sm">{success}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Logout() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => null)

    if (!response?.ok) {
      setIsLoggingOut(false)
      return
    }

    window.sessionStorage.removeItem('main-welcome-shown')
    router.replace('/auth')
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut ? (
        <>
          <Spinner />
          Logging out...
        </>
      ) : (
        <>
          <LogOut />
          Log out
        </>
      )}
    </Button>
  )
}

function Deactivate({ user }: { user: TAuthUser }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = password.length > 0 && !isSubmitting && !!user

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const response = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    })
    const data = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      setError(data?.message ?? 'Account deletion failed.')
      setIsSubmitting(false)
      return
    }

    window.sessionStorage.removeItem('main-welcome-shown')
    router.replace('/auth')
    router.refresh()
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          setShowPassword(false)
          setPassword('')
          setError('')
          setIsSubmitting(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={!user}>
          <UserRoundX />
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete <span className="text-lg font-semibold">{user?.username}</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your account and all associated data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="password">Confirm Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-12"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                }}
                required
              />
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground absolute top-1/2 right-4 -translate-y-1/2!"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
          </Field>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  Deleting...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getUserAgeDays(createdAt: string) {
  const day = 1000 * 60 * 60 * 24
  const count = Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / day))
  return `${count} day${count > 1 ? 's' : ''}`
}
