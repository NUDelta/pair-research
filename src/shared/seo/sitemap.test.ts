import { describe, expect, it } from 'vitest'
import { buildSitemapXml } from './sitemap'

describe('sitemap helper', () => {
  it('includes only canonical public indexable routes', () => {
    const sitemap = buildSitemapXml('https://pairresearch.io')

    expect(sitemap).toContain('<loc>https://pairresearch.io/</loc>')
    expect(sitemap).toContain('<loc>https://pairresearch.io/contact</loc>')
    expect(sitemap).toContain('<loc>https://pairresearch.io/privacy</loc>')
    expect(sitemap).toContain('<loc>https://pairresearch.io/terms</loc>')
    expect(sitemap).not.toContain('/login')
    expect(sitemap).not.toContain('/groups')
  })
})
