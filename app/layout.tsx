import type React from "react"
import type { Metadata } from "next"
import localFont from 'next/font/local'
import "./globals.css"
import { ThemeProvider } from "@/components/theme"
import { Toaster } from "@/components/ui/toaster"

const mapleMono = localFont({
  src: './fonts/MapleMono[wght].ttf',
  display: 'swap',
  variable: '--font-maple-mono',
})

export const metadata: Metadata = {
  title: "Персональный календарь",
  description: "Управляйте своим расписанием и задачами",
  icons: {
    icon: '/karenda.png',
    apple: '/karenda.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={mapleMono.className}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0 0.5rem 0' }}>
          <img src="/karenda.png" alt="Karenda logo" style={{ height: '64px', width: '64px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        </div>
        <ThemeProvider defaultTheme="dark" storageKey="calendar-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
