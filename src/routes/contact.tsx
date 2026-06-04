import { createFileRoute } from '@tanstack/react-router'
import ContactPage from '@/features/contact/components/ContactPage'
import { buildSeoHead } from '@/shared/seo'

export const Route = createFileRoute('/contact')({
  head: () => buildSeoHead({
    title: 'Contact',
    description: 'Contact the Pair Research team for product questions, bug reports, access issues, or abuse reports.',
    path: '/contact',
  }),
  component: ContactPage,
})
