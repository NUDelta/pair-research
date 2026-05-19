import { describe, expect, it } from 'vitest'
import { SEO_NOINDEX_ROBOTS } from './config'
import { buildPageTitle, buildSeoHead } from './head'

describe('seo head helpers', () => {
  it('builds branded page titles without duplicating the default title', () => {
    expect(buildPageTitle()).toBe('Pair Research')
    expect(buildPageTitle('Pair Research')).toBe('Pair Research')
    expect(buildPageTitle('Privacy Policy')).toBe('Privacy Policy | Pair Research')
  })

  it('builds canonical, Open Graph, Twitter, robots, and JSON-LD tags', () => {
    const head = buildSeoHead({
      title: 'Privacy Policy',
      description: 'Privacy details for Pair Research.',
      path: '/privacy',
      robots: SEO_NOINDEX_ROBOTS,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage' },
    })

    expect(head.links).toContainEqual({ rel: 'canonical', href: 'http://localhost:3000/privacy' })
    expect(head.meta).toContainEqual({ title: 'Privacy Policy | Pair Research' })
    expect(head.meta).toContainEqual({ name: 'description', content: 'Privacy details for Pair Research.' })
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' })
    expect(head.meta).toContainEqual({ property: 'og:url', content: 'http://localhost:3000/privacy' })
    expect(head.meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
    expect(head.meta).toContainEqual({ 'script:ld+json': { '@context': 'https://schema.org', '@type': 'WebPage' } })
  })
})
