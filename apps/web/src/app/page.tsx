export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-serif text-4xl font-bold tracking-tight">Cordinate</h1>
      <p className="text-center text-muted-foreground max-w-md">
        あなたの手持ち服で、今日からおしゃれに。
        <br />
        ファッションショーやインフルエンサーのコーデを参考に、
        <br />
        AIがあなただけのコーデを提案します。
      </p>
      <div className="flex gap-4">
        <a
          href="/auth/register"
          className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          無料で始める
        </a>
        <a
          href="/auth/login"
          className="rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
        >
          ログイン
        </a>
      </div>
    </main>
  )
}
