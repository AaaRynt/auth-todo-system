// app/page.tsx

export default function Home() {
  return (
    <div className="bg-background flex flex-1 flex-col items-center justify-center dark:bg-black">
      <main className="bg-background text-foreground size-150 rounded-3xl p-4 shadow-xl">
        <aside>
          <ul>
            <li>Dashboard</li>
            <li>chart</li>
            <li>setting</li>
            <li>count</li>
          </ul>
        </aside>
        <ul>
          <li>
            <a href="/auth">auth</a>
          </li>
        </ul>
      </main>
    </div>
  )
}
