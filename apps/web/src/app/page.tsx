export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          CFR Tracker
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400">
          Ai avut întârziere? Ai dreptul la banii înapoi. Caută trenul tău și generează cererea de rambursare în 30 de secunde.
        </p>
        <div className="pt-8">
          <p className="text-sm text-zinc-500">
            [In development: Search Form Component will be here]
          </p>
        </div>
      </div>
    </main>
  );
}
