// app/auth/signup.tsx
'use client'

import { Eye, EyeOff, LockKeyhole, User2 } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSet,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
} from '@/components/ui/'

export function Signup({
  onSwitch,
  onUsernameChange,
}: {
  onSwitch: () => void
  onUsernameChange: (username: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [accept, setAccept] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && confirm.length > 0 && password === confirm && accept

  return (
    <Card className="w-md shadow-xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">Sign up</CardTitle>
        <CardAction>
          <Button type="button" variant="link" onClick={onSwitch}>
            Login
          </Button>
        </CardAction>
      </CardHeader>
      <form className="space-y-8">
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
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <div className="relative">
                  <LockKeyhole
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="pr-12 pl-12"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    aria-invalid={password.length > 0 && confirm.length > 0 && password !== confirm}
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
        <CardFooter className="flex flex-col gap-2">
          <FieldLabel>
            <Field orientation="horizontal">
              <Checkbox
                id="toggle-checkbox-2"
                name="toggle-checkbox-2"
                checked={accept}
                onCheckedChange={(checked) => setAccept(checked === true)}
              />
              <FieldContent className="flex-row items-center">
                Accept&nbsp;
                <TermsConditions />
              </FieldContent>
            </Field>
          </FieldLabel>
          <Field>
            <Button type="submit" size="lg" className="w-full rounded-full" disabled={!canSubmit}>
              Sign up
            </Button>
          </Field>
        </CardFooter>
      </form>
    </Card>
  )
}

function TermsConditions() {
  return (
    <HoverCard openDelay={10} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button type="button" variant="link" className="h-auto p-0">
          terms & conditions
        </Button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="flex flex-col gap-1 px-4 py-2">
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
          <CardDescription className="text-xs">
            You agree to our usage policies and data handling practices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-4">
            <li>Your data is securely stored</li>
            <li>No unauthorized sharing</li>
            <li>You can opt out anytime</li>
          </ul>
        </CardContent>
      </HoverCardContent>
    </HoverCard>
  )
}
