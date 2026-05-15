import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scribbl — Digital Farewell Platform',
  description: 'Sign your batchmates\' virtual shirts. A digital scribble day.',
  openGraph: {
    title: 'Scribbl',
    description: 'Sign your batchmates\' virtual shirts.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
