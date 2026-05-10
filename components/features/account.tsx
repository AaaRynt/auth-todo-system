// /Users/rynt/Desktop/Code/auth-todo-system/components/features/account.tsx
import { UserCircle } from 'lucide-react'
import type { TlocalUser } from '@/app/data/type'
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
} from '@/components/ui/'

export function Account({ user }: { user: TlocalUser }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="text-muted-foreground mt-4 flex items-center gap-3 border-t px-3 pt-4 text-sm">
          <UserCircle className="size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-card-foreground truncate font-medium">{user?.username}</div>
            <div className="truncate text-xs">{user ? `${getUserAgeDays(user.createdAt)} days` : ''}</div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button">OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getUserAgeDays(createdAt: number) {
  const day = 1000 * 60 * 60 * 24
  return Math.max(1, Math.ceil((Date.now() - createdAt) / day))
}
