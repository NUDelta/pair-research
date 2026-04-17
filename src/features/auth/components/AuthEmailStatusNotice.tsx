import { CheckCircle2, MailCheck } from 'lucide-react'
import AuthStatusCard from './AuthStatusCard'

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
    <AuthStatusCard
      actionHref={actionHref}
      actionLabel={actionLabel}
      description={isVerified
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
      detail={isVerified
        ? 'Use your password or Google sign-in below. If a session was created automatically, you will be redirected by the confirmation flow instead.'
        : 'If the message does not show up in a minute, check spam or try signing up again with the same email.'}
      detailTitle="Next step"
      icon={isVerified ? CheckCircle2 : MailCheck}
      title={isVerified ? 'Email verified' : 'Check your inbox'}
    />
  )
}
