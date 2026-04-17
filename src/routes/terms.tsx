import { createFileRoute } from '@tanstack/react-router'
import LegalDocumentPage from '@/features/legal/components/LegalDocumentPage'
import { legalPageSearchSchema } from '@/features/legal/lib/legalLinks'

const sections = [
  {
    title: 'Who these terms apply to',
    body: [
      'Pair Research is a collaboration tool for coursework, research, and related academic activities. These terms apply when you create an account, join a group, or use any part of the app.',
      'If you are using Pair Research as part of a Northwestern University class, lab, or program, you must also follow Northwestern University rules, instructor expectations, and local department guidance. These terms complement those requirements and do not replace them.',
    ],
  },
  {
    title: 'Accounts and access',
    body: [
      'Use accurate account information, keep your password secure, and do not share your account with someone else. You are responsible for activity that happens through your login.',
      'We may suspend or limit access if an account is used in a way that creates security risk, disrupts the service, or violates these terms.',
    ],
  },
  {
    title: 'Acceptable use',
    body: [
      'Use the service in a respectful, lawful, and academically appropriate way. Do not use Pair Research to harass others, impersonate someone else, spam users, scrape data without permission, interfere with the service, or try to bypass security controls.',
      'Northwestern users should also follow the University’s appropriate-use expectations for electronic resources, especially when using University accounts, networks, or class-managed work.',
    ],
  },
  {
    title: 'Your content',
    body: [
      'You keep ownership of content you submit, such as your profile details, tasks, and group activity. You give Pair Research permission to store, display, and process that content as needed to operate the app and support your groups.',
      'Only upload or share material that you are allowed to use. Avoid posting confidential, regulated, or sensitive data unless your program explicitly authorizes that use and the app is approved for it.',
    ],
  },
  {
    title: 'Service changes and availability',
    body: [
      'We may improve, update, pause, or remove features over time. We aim to keep the service available, but we cannot promise uninterrupted access or that every feature will always remain the same.',
      'If a bug, outage, or policy issue affects the service, we may take reasonable steps to protect users and restore normal operation.',
    ],
  },
  {
    title: 'Questions and concerns',
    body: [
      'If you believe someone is misusing Pair Research, report it to the course staff, app administrator, or the appropriate Northwestern contact for your program.',
      'If Northwestern University policies impose stricter rules than this page, the Northwestern policies control.',
    ],
  },
] as const

const references = [
  {
    href: 'https://www.it.northwestern.edu/about/policies/appropriate-use-of-electronic-resources.html',
    label: 'Northwestern University: Appropriate Use of Electronic Resources',
  },
  {
    href: 'https://www.northwestern.edu/privacy/',
    label: 'Northwestern University: Privacy Statement',
  },
] as const

export const Route = createFileRoute('/terms')({
  validateSearch: search => legalPageSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Terms of Service | Pair Research' }],
  }),
  component: TermsPage,
})

function TermsPage() {
  const { from } = Route.useSearch()

  return (
    <LegalDocumentPage
      effectiveDate="April 14, 2026"
      from={from}
      intro="These terms explain the basic rules for using Pair Research. They are written to be clear and practical, and they should be read together with any course, lab, or Northwestern University policies that apply to your use of the platform."
      references={references}
      sections={sections}
      title="Terms of Service"
    />
  )
}
