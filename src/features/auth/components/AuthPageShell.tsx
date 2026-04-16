import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

interface AuthPageShellProps {
  alternateHref: string
  alternateLabel: string
  alternatePrompt: string
  children: ReactNode
  description?: string
  mode?: 'login' | 'signup'
  title?: string
}

export default function AuthPageShell({
  alternateHref,
  alternateLabel,
  alternatePrompt,
  children,
  description,
  mode,
  title,
}: AuthPageShellProps) {
  const resolvedTitle = title ?? (mode === 'login' ? 'Sign in to continue' : 'Create your account')
  const resolvedDescription = description ?? (mode === 'login'
    ? 'Use Google or your email and password. '
    : 'Use Google or email to get started.')

  return (
    <div className="flex items-center justify-center px-4 pb-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-20" />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 blur-3xl" />

      <div className="animate-subtle-rise w-full max-w-lg">
        <section className="rounded-4xl border border-slate-200/80 bg-white/92 p-5 shadow-md backdrop-blur transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-7 lg:p-8">
          <div className="flex h-full flex-col gap-6">
            <div className="animate-subtle-rise-delayed space-y-3">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {resolvedTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {resolvedDescription}
                </p>
              </div>
            </div>

            <div className="animate-subtle-rise-late flex-1">
              {children}
            </div>

            <div className="border-t border-slate-200/90 pt-5 text-sm text-slate-600">
              <span>{alternatePrompt}</span>
              {' '}
              <a
                href={alternateHref}
                className="group inline-flex items-center gap-1 font-semibold text-slate-950 transition-[color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:text-sky-700"
              >
                {alternateLabel}
                <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
