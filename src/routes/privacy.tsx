import { createFileRoute } from '@tanstack/react-router'
import LegalDocumentPage from '@/features/legal/components/LegalDocumentPage'
import { legalPageSearchSchema } from '@/features/legal/lib/legalLinks'

const sections = [
  {
    title: 'What we collect',
    body: [
      'We collect the information you provide to use Pair Research, including your name, email address, profile image, group activity, and any tasks or collaboration content you submit.',
      'We also collect limited technical and security information needed to operate the service, such as authentication records, device or browser details, IP-related security signals, and Turnstile verification results.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use your information to create and secure your account, connect you with the right groups, store your activity, support collaboration features, and keep the app working reliably.',
      'We may also use information to investigate misuse, troubleshoot bugs, improve the product, and meet legal, academic, or institutional obligations.',
    ],
  },
  {
    title: 'When information is shared',
    body: [
      'Your profile and collaboration content are shared with the people who need them inside the app, such as group members and authorized administrators supporting the service.',
      'We also rely on infrastructure providers to run the app, including hosted authentication, storage, and security services. We do not sell your personal information.',
    ],
  },
  {
    title: 'Northwestern context',
    body: [
      'If you use Pair Research in connection with Northwestern University, your use should also be consistent with Northwestern University privacy guidance and any department or course-specific requirements.',
      'This page is a product-specific explanation of Pair Research practices. It does not replace Northwestern University’s official privacy statement or University records and security policies.',
    ],
  },
  {
    title: 'Security and retention',
    body: [
      'We use reasonable administrative, technical, and service-provider safeguards to protect information, but no online system can guarantee absolute security.',
      'We keep data for as long as it is needed to operate the service, support academic use, resolve disputes, or comply with legal or institutional obligations.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'You can review and update basic account information from your account settings. If you need help with data questions related to a course or research program, contact the responsible instructor, administrator, or program lead.',
      'If another policy or agreement gives you additional privacy rights, those rights continue to apply.',
    ],
  },
] as const

const references = [
  {
    href: 'https://www.northwestern.edu/privacy/',
    label: 'Northwestern University: Privacy Statement',
  },
  {
    href: 'https://www.northwestern.edu/compliance/privacy/',
    label: 'Northwestern University Compliance Office: Privacy at Northwestern',
  },
] as const

export const Route = createFileRoute('/privacy')({
  validateSearch: search => legalPageSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Privacy Policy | Pair Research' }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  const { from } = Route.useSearch()

  return (
    <LegalDocumentPage
      effectiveDate="April 14, 2026"
      from={from}
      intro="This privacy page explains, in plain language, what Pair Research collects, how it is used, and how the Northwestern University context affects those expectations. It is meant to be understandable first and comprehensive second."
      references={references}
      sections={sections}
      title="Privacy Policy"
    />
  )
}
