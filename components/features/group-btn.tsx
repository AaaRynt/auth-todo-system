// components/features/group-btn.tsx
'use client'

import { RiGithubFill } from '@remixicon/react'
import { Export, Theme } from '@/components/features'
import { Button, ButtonGroup } from '@/components/ui'

export function GroupBtn() {
  return (
    <ButtonGroup className="hidden sm:flex">
      <Export />
      <Theme />
      <GitHub />
    </ButtonGroup>
  )
}

function GitHub() {
  return (
    <Button asChild variant="outline" size="icon-lg">
      <a href="https://github.com/AaaRynt/auth-todo-system" target="_blank" rel="noreferrer">
        <RiGithubFill />
      </a>
    </Button>
  )
}
