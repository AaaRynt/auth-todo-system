'use client'

import { Clock, Eye, EyeOff, LockKeyhole, ShieldCheck, User2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export default function Auth() {
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
      <Login />
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
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)

  const getTimeParts = (time: string) => {
    const [hours = '--', minutes = '--', seconds = '--'] = time.split(':')
    return { hours, minutes, seconds }
  }

  const getGreeting = (date: Date) => {
    const hour = date.getHours()
    if (hour < 6) return 'It is too late...'
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    if (hour < 24) return 'Good evening!'
  }

  const greeting = useMemo(() => (now ? getGreeting(now) : 'Welcome back'), [now])
  const date = useMemo(() => formatDate(now), [now])
  const clock = useMemo(() => (now ? formatTime(now) : '--:--:--'), [now])
  const timeParts = useMemo(() => getTimeParts(clock), [clock])
  const colon = `transition-opacity ${now && now.getSeconds() % 2 === 1 ? 'opacity-10' : 'opacity-100'}`
  return (
    <>
      <Badge className="bg-muted/40 text-muted-foreground inline-flex items-center gap-2 rounded-lg border px-6 py-4 text-sm">
        <Clock aria-hidden="true" />
        <time dateTime={`${date} ${clock}`} className="font-mono tabular-nums">
          <span>{date}</span>
          <span className="px-2 opacity-50">/</span>
          <span>{timeParts.hours}</span>
          <span className={colon}>:</span>
          <span>{timeParts.minutes}</span>
          <span className={colon}>:</span>
          <span>{timeParts.seconds}</span>
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

function Login() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Card className="w-md shadow-xl">
      <CardHeader className="gap-2">
        <CardTitle className="text-xl">Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
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
                    type="username"
                    autoComplete="username"
                    className="pl-12"
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

          <FieldGroup>
            <Button type="submit" size="lg" className="w-full rounded-full">
              Login
            </Button>
            <FieldSeparator>or</FieldSeparator>
            <Button type="button" variant="outline" size="lg" className="w-full rounded-full">
              Sign up
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
