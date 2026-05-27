// app/auth/page.tsx
'use client'

import { useState } from 'react'
import { GroupBtn } from '@/components/features'
import { Login } from './login'
import { Other } from './other'
import { Signup } from './signup'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [activeUsername, setActiveUsername] = useState('')

  // [todo] 路由拆分
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-1 flex-col items-center justify-center gap-8 sm:flex-row sm:justify-evenly sm:px-8">
      <div className="absolute top-1/100 right-1/100">
        <GroupBtn />
      </div>
      <Other username={activeUsername} />
      {isLogin ? (
        <Login onSwitch={() => setIsLogin(false)} onUsernameChange={setActiveUsername} />
      ) : (
        <Signup onSwitch={() => setIsLogin(true)} onUsernameChange={setActiveUsername} />
      )}
    </main>
  )
}
