import { describe, expect, it } from 'vitest'
import { SEO_DEFAULT_IMAGE_ALT, SEO_NOINDEX_ROBOTS } from './config'
import { buildPageTitle, buildRootSeoMeta, buildSeoHead } from './head'

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
      keywords: ['Pair Research privacy', 'academic collaboration privacy'],
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage' },
    })

    expect(head.links).toContainEqual({ rel: 'canonical', href: 'http://localhost:3000/privacy' })
    expect(head.meta).toContainEqual({ title: 'Privacy Policy | Pair Research' })
    expect(head.meta).toContainEqual({ name: 'description', content: 'Privacy details for Pair Research.' })
    expect(head.meta).toContainEqual({ name: 'keywords', content: 'Pair Research privacy, academic collaboration privacy' })
    expect(head.meta).toContainEqual({ name: 'robots', content: SEO_NOINDEX_ROBOTS })
    expect(head.meta).toContainEqual({ property: 'og:locale', content: 'en_US' })
    expect(head.meta).toContainEqual({ property: 'og:url', content: 'http://localhost:3000/privacy' })
    expect(head.meta).toContainEqual({ property: 'og:image:alt', content: SEO_DEFAULT_IMAGE_ALT })
    expect(head.meta).toContainEqual({ property: 'og:image:width', content: '1776' })
    expect(head.meta).toContainEqual({ property: 'og:image:height', content: '1170' })
    expect(head.meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
    expect(head.meta).toContainEqual({ name: 'twitter:image:alt', content: SEO_DEFAULT_IMAGE_ALT })
    expect(head.meta).toContainEqual({ 'script:ld+json': { '@context': 'https://schema.org', '@type': 'WebPage' } })
  })

  it('omits blank keyword entries', () => {
    const head = buildSeoHead({ keywords: ['Pair Research', ' ', 'peer support'] })

    expect(head.meta).toContainEqual({ name: 'keywords', content: 'Pair Research, peer support' })
  })

  it('adds root application metadata', () => {
    expect(buildRootSeoMeta()).toContainEqual({ name: 'application-name', content: 'Pair Research' })
  })
})
