import { describe, expect, it } from 'vitest'
import { buildRobotsTxt } from './robots'

describe('robots.txt helper', () => {
  it('blocks all crawling when indexing is disabled', () => {
    expect(buildRobotsTxt({
      siteBaseUrl: 'https://pairresearch.io',
      indexingEnabled: false,
    })).toBe([
      'User-agent: *',
      'Disallow: /',
      '',
      'Sitemap: https://pairresearch.io/sitemap.xml',
    ].join('\n'))
  })

  it('allows public routes and blocks auth/private app routes when indexing is enabled', () => {
    const robots = buildRobotsTxt({
      siteBaseUrl: 'https://pairresearch.io',
      indexingEnabled: true,
    })

    expect(robots).toContain('Allow: /$')
    expect(robots).toContain('Disallow: /groups')
    expect(robots).toContain('Disallow: /login')
    expect(robots).toContain('Sitemap: https://pairresearch.io/sitemap.xml')
  })
})
