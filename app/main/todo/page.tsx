// app/main/todo/page.tsx
import { ListTodo } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Todo() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-100 p-6">
        <CardHeader>
          <CardTitle className="flex flex-col items-center">
            <Badge variant="outline" className="size-12 rounded-md" asChild>
              <ListTodo />
            </Badge>
            manage your To-Dos
          </CardTitle>
          <CardAction></CardAction>
        </CardHeader>
      </Card>
    </div>
  )
}
