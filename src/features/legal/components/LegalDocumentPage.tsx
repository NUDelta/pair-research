import type { LegalEntryPoint } from '@/features/legal/lib/legalLinks'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { getLegalReturnLink } from '@/features/legal/lib/legalLinks'

interface LegalSection {
  body: readonly string[]
  title: string
}

interface LegalReference {
  href: string
  label: string
}

interface LegalDocumentPageProps {
  effectiveDate: string
  from?: LegalEntryPoint
  intro: string
  references?: readonly LegalReference[]
  sections: readonly LegalSection[]
  title: string
}

export default function LegalDocumentPage({
  effectiveDate,
  from,
  intro,
  references,
  sections,
  title,
}: LegalDocumentPageProps) {
  const returnLink = getLegalReturnLink(from)

  return (
    <div className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {returnLink !== undefined && (
          <div className="pt-2">
            <Link
              to={returnLink.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {returnLink.label}
            </Link>
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-sm sm:p-8">
          <div className="space-y-3 border-b border-slate-200 pb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700">Pair Research</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              {intro}
            </p>
            <p className="text-sm text-slate-500">
              Effective date:
              {' '}
              {effectiveDate}
            </p>
          </div>

          <div className="space-y-8 pt-6">
            {sections.map(section => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
                <div className="space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
                  {section.body.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            {references !== undefined && references.length > 0 && (
              <section className="space-y-3 border-t border-slate-200 pt-6">
                <h2 className="text-xl font-semibold text-slate-950">Northwestern references</h2>
                <p className="text-sm leading-7 text-slate-700 sm:text-base">
                  These pages were written to stay consistent with the Northwestern guidance below.
                </p>
                <ul className="space-y-2 text-sm leading-7 sm:text-base">
                  {references.map(reference => (
                    <li key={reference.href}>
                      <a
                        href={reference.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sky-700 transition hover:text-slate-950"
                      >
                        {reference.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
