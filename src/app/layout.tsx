import type { Metadata } from 'next'
import { Footer, Header } from '@/components/layout'
import { SITE_BASE_URL } from '@/utils/constants'
import { Lato } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const lato = Lato({
  weight: ['100', '300', '400', '700', '900'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lato',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  title: 'Pair Research',
  alternates: { canonical: SITE_BASE_URL },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} font-sans flex max-h-full min-h-screen flex-col antialiased`}
      >
        <Toaster position="top-center" richColors />
        <Header />
        <main className="grow mt-10 motion-safe:animate-fade-in-down">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
