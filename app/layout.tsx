// Layout raíz: aplica tema y metadatos globales
import type { Metadata } from 'next'
import '../styles/globals.css'
import { ThemeProvider } from '../components/theme-provider'

export const metadata: Metadata = {
  title: 'Arca Continental Dashboard',
  description: 'Dashboard corporativo para monitoreo de coolers - Arca Continental',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
