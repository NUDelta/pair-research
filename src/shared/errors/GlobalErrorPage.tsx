import { Link } from '@tanstack/react-router'
import { AlertTriangle, Download, Home, RefreshCw, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  buildErrorReport,
  buildReportId,
  downloadErrorReport,
  isFallbackErrorMessage,
  normalizeError,
} from '@/shared/errors/lib/globalErrorReporting'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/buttonVariants'
import ErrorPageScaffold from './ErrorPageScaffold'

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}) {
  const normalizedError = useMemo(() => normalizeError(error), [error])
  const reportId = useMemo(() => buildReportId(normalizedError), [normalizedError])
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)

  const technicalSummary = isFallbackErrorMessage(normalizedError.message)
    ? null
    : normalizedError.message
  const hasDownloadMessage = downloadMessage !== null
  const hasTechnicalSummary = technicalSummary !== null
  const hasAdditionalDetails = normalizedError.details !== undefined && normalizedError.details !== ''
  const hasStack = normalizedError.stack !== undefined && normalizedError.stack !== ''

  const handleDownload = () => {
    try {
      const report = buildErrorReport(normalizedError, reportId)
      downloadErrorReport(report)
      setDownloadMessage(`Support report ${reportId} downloaded.`)
    }
    catch {
      setDownloadMessage(
        `We could not download the support report. Share the report ID ${reportId} with the team.`,
      )
    }
  }

  return (
    <ErrorPageScaffold
      label="Unexpected error"
      title="We couldn't load this page."
      description={(
        <>
          <p>
            This screen hit an unexpected problem before it finished loading.
          </p>
          <p>
            Try again first. If the problem keeps happening, download the support report and share it with the team so they can trace the failure faster.
          </p>
        </>
      )}
      icon={<AlertTriangle className="size-4" aria-hidden="true" />}
      actions={(
        <>
          <Button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download aria-hidden="true" />
            Download report
          </Button>
          <Link
            to="/"
            className={cn(buttonVariants({ variant: 'secondary' }), 'no-underline')}
          >
            <Home aria-hidden="true" />
            Back home
          </Link>
          <Button type="button" variant="ghost" onClick={() => globalThis.location.reload()}>
            <RefreshCw aria-hidden="true" />
            Reload browser
          </Button>
        </>
      )}
      footer={(
        <div className="space-y-2">
          <p className="font-medium text-foreground">What to include when you report it</p>
          <ul className="space-y-1">
            <li>
              Report ID:
              {' '}
              <span className="font-mono text-xs font-semibold">{reportId}</span>
            </li>
            <li>The support report file from the button above.</li>
            <li>What you were trying to do when the page failed.</li>
          </ul>
          {hasDownloadMessage
            ? (
                <p role="status" className="font-medium text-foreground">
                  {downloadMessage}
                </p>
              )
            : null}
        </div>
      )}
      aside={(
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Support reference
            </p>
            <p className="mt-2 font-mono text-sm font-semibold tracking-wide text-foreground">
              {reportId}
            </p>
          </div>

          {hasTechnicalSummary
            ? (
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Technical summary
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-foreground">
                    {technicalSummary}
                  </p>
                </div>
              )
            : null}

          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="font-medium text-foreground">Recommended next step</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Retry this page first. If it fails again, download the report before you navigate away so the current error details stay attached.
            </p>
          </div>

          <details className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
              Technical details
            </summary>
            <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Error type</dt>
                <dd>{normalizedError.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Thrown value kind</dt>
                <dd>{normalizedError.thrownType}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Message</dt>
                <dd className="break-words">{normalizedError.message}</dd>
              </div>
              {hasAdditionalDetails
                ? (
                    <div>
                      <dt className="font-medium text-foreground">Additional context</dt>
                      <dd className="break-words whitespace-pre-wrap">{normalizedError.details}</dd>
                    </div>
                  )
                : null}
            </dl>

            {hasStack
              ? (
                  <pre className="mt-4 max-h-56 overflow-auto rounded-xl border border-border/70 bg-muted/50 p-3 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                    {normalizedError.stack}
                  </pre>
                )
              : null}
          </details>
        </div>
      )}
    />
  )
}
