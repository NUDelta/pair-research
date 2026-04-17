import type { ReactNode } from 'react'
import { Card, CardContent } from '@/shared/ui/card'

interface ErrorPageScaffoldProps {
  actions: ReactNode
  aside: ReactNode
  description: ReactNode
  footer?: ReactNode
  icon: ReactNode
  label: string
  title: string
}

export default function ErrorPageScaffold({
  actions,
  aside,
  description,
  footer,
  icon,
  label,
  title,
}: ErrorPageScaffoldProps) {
  return (
    <div className="relative isolate mx-auto flex min-h-[70vh] w-full max-w-6xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full overflow-hidden border-border/70 bg-background/95 shadow-xl backdrop-blur-sm">
        <CardContent className="grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] md:px-10 md:py-10">
          <section className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-foreground uppercase">
              {icon}
              <span>{label}</span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <div className="max-w-2xl space-y-3 text-base leading-7 text-muted-foreground">
                {description}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {actions}
            </div>

            {footer !== undefined
              ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm leading-6 text-muted-foreground">
                    {footer}
                  </div>
                )
              : null}
          </section>

          <aside className="rounded-3xl border border-border/70 bg-muted/45 p-5 shadow-sm">
            {aside}
          </aside>
        </CardContent>
      </Card>
    </div>
  )
}
