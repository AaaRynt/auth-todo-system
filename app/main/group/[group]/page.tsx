// app/main/group/[group]/page.tsx
import { TodoPage } from '@/app/main/todo/todo-page'

export default async function GroupTasksPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params
  const groupName = decodeGroupParam(group)

  return <TodoPage key={groupName} groupName={groupName} />
}

function decodeGroupParam(group: string) {
  try {
    return decodeURIComponent(group)
  } catch {
    return group
  }
}
