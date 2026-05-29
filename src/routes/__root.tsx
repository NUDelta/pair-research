import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import GoogleOneTap from '@/features/auth/components/GoogleOneTap'
import { Footer, Header } from '@/shared/components/layout'
import GlobalErrorPage from '@/shared/errors/GlobalErrorPage'
import NotFoundPage from '@/shared/errors/NotFoundPage'
import { buildRootSeoMeta } from '@/shared/seo'
import { TooltipProvider } from '@/shared/ui/tooltip'
import appleIcon from './apple-icon.png?url'
import favicon from './favicon.ico?url'
import icon0 from './icon0.svg?url'
import icon1 from './icon1.png?url'
import '@/shared/styles/globals.css'

export const Route = createRootRoute({
  head: () => {
    const links: Array<{ rel: string, href: string, type?: string, sizes?: string }> = [
      { rel: 'icon', href: favicon ?? '/favicon.ico' },
      { rel: 'apple-touch-icon', href: appleIcon ?? '/apple-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: icon1 ?? '/icon1.png' },
      { rel: 'icon', type: 'image/svg+xml', href: icon0 ?? '/icon0.svg' },
    ]

    return {
      meta: buildRootSeoMeta(),
      links,
    }
  },
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error, reset }) => <GlobalErrorPage error={error} reset={reset} />,
})

function RootComponent() {
  return (
    <RootDocument>
      <TooltipProvider>
        <GoogleOneTap />
        <Toaster position="top-center" richColors />
        <Header />
        <main className="mt-10 grow motion-safe:animate-fade-in-down">
          <Outlet />
        </main>
        <Footer />
      </TooltipProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex max-h-full min-h-screen flex-col font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
