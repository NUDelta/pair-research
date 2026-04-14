import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

interface AuthStatusCardProps {
  actionHref?: string
  actionLabel?: string
  description: ReactNode
  detail: ReactNode
  detailTitle: string
  icon: LucideIcon
  title: string
  tone?: 'amber' | 'emerald'
}

const toneStyles = {
  amber: {
    accent: 'text-amber-700',
    detailBorder: 'border-amber-200',
    detailPanel: 'bg-white/70',
    iconBackground: 'bg-amber-500/12',
    panel: 'border-amber-200/80 bg-amber-50/90',
    text: 'text-slate-700',
  },
  emerald: {
    accent: 'text-emerald-700',
    detailBorder: 'border-emerald-200',
    detailPanel: 'bg-white/70',
    iconBackground: 'bg-emerald-500/12',
    panel: 'border-emerald-200/80 bg-emerald-50/90',
    text: 'text-slate-700',
  },
} as const

export default function AuthStatusCard({
  actionHref,
  actionLabel,
  description,
  detail,
  detailTitle,
  icon: Icon,
  title,
  tone = 'emerald',
}: AuthStatusCardProps) {
  const styles = toneStyles[tone]

  return (
    <div className={`space-y-5 rounded-[1.75rem] border p-5 text-slate-900 ${styles.panel}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${styles.accent} ${styles.iconBackground}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          <div className={`text-sm leading-6 ${styles.text}`}>
            {description}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 text-sm leading-6 ${styles.detailBorder} ${styles.detailPanel} ${styles.text}`}>
        <div className="flex items-center gap-2 font-medium text-slate-900">
          <Icon className={`size-4 ${styles.accent}`} aria-hidden="true" />
          {detailTitle}
        </div>
        <div className="mt-2">
          {detail}
        </div>
      </div>

      {actionHref !== undefined && actionLabel !== undefined && (
        <Button asChild className="h-12 w-full rounded-xl text-sm font-semibold">
          <a href={actionHref}>
            {actionLabel}
          </a>
        </Button>
      )}
    </div>
  )
}
