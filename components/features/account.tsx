// components/features/account.tsx
import { LogOut, UserCircle, UserRoundKey } from 'lucide-react'
import type { TAuthUser } from '@/app/data/type'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FieldLabel,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
        <Field user={user} />
        <Button variant="outline">
          <LogOut />
          Log out
        </Button>
        <Button variant="destructive">Deactivate account</Button>
      </PopoverContent>
    </Popover>
  )
}

function Field({ user }: { user: TAuthUser }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserRoundKey />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit your account</DialogTitle>
        </DialogHeader>
        <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
        <Input id="nickname" placeholder={user?.username} />
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input id="password" type="password" placeholder="New password" />
        <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
        <Input id="confirm-password" type="password" />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getUserAgeDays(createdAt: string) {
  const day = 1000 * 60 * 60 * 24
  const count = Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / day))
  return `${count} day${count > 1 ? 's' : ''}`
}
