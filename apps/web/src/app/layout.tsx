import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Cordinate — あなたの服でおしゃれに',
  description: 'ファッション初心者でも、手持ち服で簡単におしゃれなコーデが組めるアプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
