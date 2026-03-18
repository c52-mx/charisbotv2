import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Charis Portal',
  description: 'Portal de gestión de pedidos Charis',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
