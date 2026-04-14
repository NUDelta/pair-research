import { CheckCircle2, MailCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'

interface AuthEmailStatusNoticeProps {
  actionHref?: string
  actionLabel?: string
  email?: string
  variant: 'check-email' | 'verified'
}

export default function AuthEmailStatusNotice({
  actionHref,
  actionLabel,
  email,
  variant,
}: AuthEmailStatusNoticeProps) {
  const isVerified = variant === 'verified'
  const hasEmail = email !== undefined && email !== ''

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/90 p-5 text-slate-900">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700">
          {isVerified
            ? <CheckCircle2 className="size-5" aria-hidden="true" />
            : <MailCheck className="size-5" aria-hidden="true" />}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {isVerified ? 'Email verified' : 'Check your inbox'}
          </h3>
          <p className="text-sm leading-6 text-slate-700">
            {isVerified
              ? (
                  <>
                    Your email has been confirmed
                    {hasEmail ? ` for ${email}` : ''}
                    . Sign in to continue.
                  </>
                )
              : (
                  <>
                    We sent a confirmation link to
                    {' '}
                    <span className="font-semibold">{email ?? 'your email address'}</span>
                    . Open it to finish setting up your account, then sign in here.
                  </>
                )}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 text-sm leading-6 text-slate-700">
        <div className="flex items-center gap-2 font-medium text-slate-900">
          <MailCheck className="size-4 text-emerald-700" aria-hidden="true" />
          Next step
        </div>
        <p className="mt-2">
          {isVerified
            ? 'Use your password or Google sign-in below. If a session was created automatically, you will be redirected by the confirmation flow instead.'
            : 'If the message does not show up in a minute, check spam or try signing up again with the same email.'}
        </p>
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
