// app/auth/other.tsx
'use client'

import { Clock, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Other({ username }: { username: string }) {
  return (
    <section className="flex w-md flex-col gap-12 sm:w-auto">
      <div className="flex flex-col gap-4">
        <Time username={username} />
        <p className="text-muted-foreground max-w-lg text-base leading-7">
          Sign in to continue managing your todos, account security, and daily workflow. Your session is protected with
          secure credentials.
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
  )
}

function Time({ username }: { username: string }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNow(new Date())
    })
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(timer)
    }
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
    if (hour < 24) return 'Good evening'
  }

  const date = now ? formatDate(now) : '---- -- --'.replaceAll(' ', '-')
  const clock = now ? formatTime(now) : '--:--:--'
  const greeting = now ? getGreeting(now) : 'Welcome back'
  const displayName = username.trim()
  const [hours, minutes, seconds] = clock.split(':')
  const colon = `transition-opacity ${now && now.getSeconds() % 2 === 1 ? 'opacity-20' : 'opacity-100'}`
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
      <h2 className="text-3xl font-bold">
        {greeting}
        {displayName ? `, ${displayName}` : ''}
      </h2>
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
