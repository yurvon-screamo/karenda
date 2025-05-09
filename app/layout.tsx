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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={mapleMono.className}>
        <ThemeProvider defaultTheme="dark" storageKey="calendar-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
