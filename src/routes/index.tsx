import { createFileRoute } from '@tanstack/react-router'
import HomePage from '@/features/home/components/HomePage'
import {
  buildOrganizationJsonLd,
  buildSeoHead,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from '@/shared/seo'

export const Route = createFileRoute('/')({
  head: () => buildSeoHead({
    title: 'Collaborative Peer Support for Research Groups',
    description: 'Pair Research helps academic teams match collaborators, overcome blockers, and coordinate structured peer support inside research and classroom groups.',
    path: '/',
    jsonLd: [
      buildOrganizationJsonLd(),
      buildWebSiteJsonLd(),
      buildSoftwareApplicationJsonLd(),
    ],
  }),
  component: HomePage,
})
