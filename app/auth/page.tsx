'use client'

import { Clock, Eye, EyeOff, LockKeyhole, ShieldCheck, User2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from '@/components/ui/field'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-1 flex-row items-center justify-evenly px-8">
      <section className="flex flex-col gap-8">
        <div className="space-y-4">
          <Time />
          <p className="text-muted-foreground max-w-lg text-base leading-7">
            Sign in to continue managing your <strong>todos</strong>, account security, and daily workflow. Your session
            is protected with secure credentials.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-2 gap-4">
          <Introduce
            Icon={LockKeyhole}
            title="Private session"
            p="Stay signed in on trusted devices for faster access."
          />
          <Introduce Icon={ShieldCheck} title="Secure access" p="Use protected credentials to enter your workspace." />
        </div>
      </section>
      {isLogin ? <Login onSwitch={() => setIsLogin(false)} /> : <Signup onSwitch={() => setIsLogin(true)} />}
    </main>
  )
}

function Time() {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const YYYY = date.getFullYear()
    const MM = String(date.getMonth() + 1).padStart(2, '0')
    const DD = String(date.getDate()).padStart(2, '0')
    return `${YYYY}-${MM}-${DD}`
  }
  const formatTime = (date: Date) => {
    const HH = String(date.getHours()).padStart(2, '0')
    const MM = String(date.getMinutes()).padStart(2, '0')
    const SS = String(date.getSeconds()).padStart(2, '0')
    return `${HH}:${MM}:${SS}`
  }
  const getGreeting = (date: Date) => {
    const hour = date.getHours()
    if (hour < 6) return 'It is too late...'
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    if (hour < 24) return 'Good evening!'
  }

  const date = formatDate(now)
  const clock = formatTime(now)
  const greeting = getGreeting(now)
  const [hours, minutes, seconds] = clock.split(':')
  const colon = `transition-opacity ${now && now.getSeconds() % 2 === 1 ? 'opacity-10' : 'opacity-100'}`
  return (
    <>
      <Badge className="bg-muted/40 text-muted-foreground inline-flex items-center gap-2 rounded-lg border px-6 py-4 text-sm">
        <Clock aria-hidden="true" />
        <time dateTime={`${date}T${clock}`} className="font-mono tabular-nums">
          <span>{date}</span>
          <span className="px-2 opacity-50">/</span>
          <span>{hours}</span>
          <span className={colon}>:</span>
          <span>{minutes}</span>
          <span className={colon}>:</span>
          <span>{seconds}</span>
        </time>
      </Badge>
      <h1 className="text-5xl font-bold">{greeting}</h1>
    </>
  )
}

function Introduce({
  Icon,
  title,
  p,
}: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  p: string
}) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2 text-xl">
        <Icon className="text-primary size-6" aria-hidden="true" />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">{p}</CardContent>
    </Card>
  )
}

function Login({ onSwitch }: { onSwitch: () => void }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-md shadow-xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">Login</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" className="hover:text-destructive">
            <X />
          </Button>
        </CardAction>
      </CardHeader>
      <form className="space-y-6">
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
                  <Input id="username" name="username" type="text" autoComplete="username" className="pl-12" required />
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
            <Button type="submit" size="lg" className="w-full rounded-full">
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

function Signup({ onSwitch }: { onSwitch: () => void }) {
  const [showPassword, setShowPassword] = useState(false)

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
      <form className="space-y-6">
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
                  <Input id="username" name="username" type="text" autoComplete="username" className="pl-12" required />
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
              <Checkbox id="toggle-checkbox-2" name="toggle-checkbox-2" />
              <FieldContent className="flex-row items-center">
                Accept&nbsp;
                <HoverCard openDelay={10} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button type="button" variant="link" className="h-auto p-0">
                      terms and conditions
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
              </FieldContent>
            </Field>
          </FieldLabel>
          <Field>
            <Button type="submit" size="lg" className="w-full rounded-full">
              Sign up
            </Button>
          </Field>
        </CardFooter>
      </form>
    </Card>
  )
}
