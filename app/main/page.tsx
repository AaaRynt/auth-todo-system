// app/page.tsx

export default function Main() {
  return (
    <div className="bg-background flex flex-1 flex-row items-center justify-center dark:bg-black">
      <aside className="bg-card p-10">
        <ul>
          <li>Dashboard</li>
          <li>chart</li>
          <li>setting</li>
          <li>count</li>
        </ul>
      </aside>
      <main className="bg-background text-foreground flex size-150 flex-row rounded-3xl p-4 shadow-xl"></main>
    </div>
  )
}
