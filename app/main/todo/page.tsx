// app/main/todo/page.tsx
import { redirect } from 'next/navigation'

export default function TodoRedirectPage() {
  redirect('/main/all')
}
