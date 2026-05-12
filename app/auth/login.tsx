// app/auth/Login.tsx
'use client'

import { Eye, EyeOff, LockKeyhole, User2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TlocalUser } from '@/app/data/type'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
  Input,
} from '@/components/ui/'

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
  const router = useRouter()
  const canSubmit = username.trim().length > 0 && password.length > 0

  return (
    <Card className="w-md shadow-xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">Login</CardTitle>
      </CardHeader>
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault()
          window.localStorage.setItem(
            'user',
            JSON.stringify({
              id: crypto.randomUUID(),
              username: username.trim(),
              password: password,
              createdAt: Date.now(),
            } satisfies TlocalUser),
          )
          router.push('/main')
        }}
      >
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
                    onChange={(event) => {
                      setUsername(event.target.value)
                      onUsernameChange(event.target.value)
                    }}
                    required
                  />
                </div>
              </Field>

              <Field>
                <div className="flex items-center gap-3">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a href="#" className="text-primary ml-auto text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </div>
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
                    onChange={(event) => setPassword(event.target.value)}
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
        </CardContent>
        <CardFooter>
          <FieldGroup>
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={!canSubmit}>
              Login
            </Button>
            <FieldSeparator>or</FieldSeparator>
            <Button type="button" variant="outline" size="lg" className="w-full rounded-full" onClick={onSwitch}>
              Sign up
            </Button>
          </FieldGroup>
        </CardFooter>
      </form>
    </Card>
  )
}
