// app/auth/login.tsx
'use client'

import { Eye, EyeOff, LockKeyhole, User2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  Input,
  Spinner,
} from '@/components/ui'

export function Login({
  onSwitch,
  onUsernameChange,
}: {
  onSwitch: () => void
  onUsernameChange: (username: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const canSubmit = username.trim().length > 0 && password.length > 0 && !isSubmitting
  const errorId = 'login-form-error'

  const handleSubmit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })
      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setError(data?.message ?? 'Login failed.')
        return
      }

      window.sessionStorage.removeItem('main-welcome-shown')
      router.push('/main')
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-md shadow-xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">Login</CardTitle>
      </CardHeader>
      <form className="space-y-8" onSubmit={handleSubmit}>
        <CardContent>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <div className="relative">
                  <User2
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    className="pl-12"
                    value={username}
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={!!error}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      onUsernameChange(event.target.value)
                      setError('')
                    }}
                    required
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <LockKeyhole
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-12 pl-12"
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
            </FieldGroup>
          </FieldSet>
          {error ? (
            <FieldError id={errorId} className="mt-4">
              {error}
            </FieldError>
          ) : null}
        </CardContent>
        <CardFooter>
          <FieldGroup>
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  Logging in
                </>
              ) : (
                'Login'
              )}
            </Button>
            <FieldSeparator>or</FieldSeparator>
            {!isSubmitting && (
              <Button type="button" variant="outline" size="lg" className="w-full rounded-full" onClick={onSwitch}>
                Sign up
              </Button>
            )}
          </FieldGroup>
        </CardFooter>
      </form>
    </Card>
  )
}
