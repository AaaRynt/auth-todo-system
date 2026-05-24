// components/features/account.tsx
'use client'

import { Eye, EyeOff, LogOut, UserCircle, UserRoundKey, UserRoundX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
} from '@/components/ui/'
import { nicknameMaxLength } from '@/lib/auth/profile'

export function Account({ user, setUser }: { user: TAuthUser; setUser: (user: TAuthUser) => void }) {
  const displayName = user?.nickname ?? user?.username ?? 'Account'

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
            <div className="text-card-foreground truncate font-medium">{displayName}</div>
            <div className="truncate text-xs">{user ? getUserAgeDays(user.createdAt) : ''}</div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <EditProfile user={user} setUser={setUser} />
        <ChangePasswordField />
        <Logout />
        <Deactivate user={user} />
      </PopoverContent>
    </Popover>
  )
}

function EditProfile({ user, setUser }: { user: TAuthUser; setUser: (user: TAuthUser) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [nickname, setNickname] = useState(user?.nickname ?? user?.username ?? '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nicknameId = 'profile-nickname'
  const nicknameDescriptionId = 'profile-nickname-description'
  const errorId = 'profile-error'
  const currentNickname = user?.nickname ?? user?.username ?? ''
  const trimmedNickname = nickname.trim()
  const nicknameChanged = trimmedNickname !== currentNickname
  const nicknameTooLong = trimmedNickname.length > nicknameMaxLength
  const canSubmit = !!user && nicknameChanged && !!trimmedNickname && !nicknameTooLong && !isSubmitting

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()

    if (!canSubmit) return

    setError('')
    setIsSubmitting(true)

    const response = await fetch('/api/auth/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nickname: trimmedNickname }),
    })
    const data = (await response.json().catch(() => null)) as { user?: NonNullable<TAuthUser>; message?: string } | null

    if (!response.ok || !data?.user) {
      setError(data?.message ?? 'Profile update failed.')
      setIsSubmitting(false)
      return
    }

    setUser(data.user)
    toast.success(`Hello, ${data.user.nickname}`, { position: 'top-center' })
    setIsSubmitting(false)
    setIsOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)

        if (open) {
          setNickname(user?.nickname ?? user?.username ?? '')
        } else {
          setError('')
          setIsSubmitting(false)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!user}>
          <UserCircle />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the name shown in your account menu.</DialogDescription>
          </DialogHeader>
          {/* [todo]: Update the Avatar */}
          <Field>
            <FieldLabel htmlFor={nicknameId}>Nickname</FieldLabel>
            <Input
              type="text"
              name="nickname"
              id={nicknameId}
              value={nickname}
              maxLength={nicknameMaxLength}
              aria-describedby={error ? `${nicknameDescriptionId} ${errorId}` : nicknameDescriptionId}
              aria-invalid={!!error || nicknameTooLong}
              onChange={(event) => {
                setNickname(event.target.value)
                setError('')
              }}
              required
            />
            <FieldDescription id={nicknameDescriptionId} className="text-xs">
              1-{nicknameMaxLength} characters.
            </FieldDescription>
          </Field>
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
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
  const currentPasswordId = 'change-password-current'
  const newPasswordId = 'change-password-new'
  const confirmPasswordId = 'change-password-confirm'
  const passwordDescriptionId = 'change-password-description'
  const messageId = 'change-password-message'

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
            <DialogDescription>Choose a new password for this account.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={currentPasswordId}>Current Password</FieldLabel>
              <div className="relative">
                <Input
                  id={currentPasswordId}
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-12"
                  value={currentPassword}
                  aria-describedby={error || success ? messageId : undefined}
                  aria-invalid={!!error}
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
            </Field>
            <Field>
              <FieldLabel htmlFor={newPasswordId}>New Password</FieldLabel>
              <div className="relative">
                <Input
                  id={newPasswordId}
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-12"
                  value={newPassword}
                  aria-describedby={error || success ? `${passwordDescriptionId} ${messageId}` : passwordDescriptionId}
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
              <FieldDescription id={passwordDescriptionId} className="text-xs">
                At least 6 characters with uppercase letters, lowercase letters, and numbers.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={confirmPasswordId}>Confirm Password</FieldLabel>
              <div className="relative">
                <Input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-12"
                  value={confirmPassword}
                  aria-describedby={error || success ? messageId : undefined}
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
            </Field>
          </FieldGroup>
          {error ? <FieldError id={messageId}>{error}</FieldError> : null}
          {success ? (
            <p id={messageId} role="status" className="text-muted-foreground text-sm">
              {success}
            </p>
          ) : null}
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
  const passwordId = 'delete-account-password'
  const errorId = 'delete-account-error'

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
            <FieldLabel htmlFor={passwordId}>Confirm Password</FieldLabel>
            <div className="relative">
              <Input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-12"
                value={password}
                aria-describedby={error ? errorId : undefined}
                aria-invalid={!!error}
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
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
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
