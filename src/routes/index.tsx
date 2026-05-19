import { createFileRoute } from '@tanstack/react-router'
import HomePage from '@/features/home/components/HomePage'
import {
  buildPairResearchJsonLd,
  buildSeoHead,
  SEO_HOME_KEYWORDS,
} from '@/shared/seo'

export const Route = createFileRoute('/')({
  head: () => buildSeoHead({
    description: 'Pair Research helps academic teams match collaborators, overcome blockers, and coordinate structured peer support inside research and classroom groups.',
    path: '/',
    keywords: SEO_HOME_KEYWORDS,
    jsonLd: buildPairResearchJsonLd(),
  }),
  component: HomePage,
})
