import { describe, expect, it } from 'vitest'
import { buildPairResearchJsonLd } from './structuredData'

describe('structured data helpers', () => {
  it('describes Pair Research as a website and web application without commercial offer fields', () => {
    const jsonLd = buildPairResearchJsonLd()

    expect(jsonLd['@context']).toBe('https://schema.org')
    const nodeTypes = jsonLd['@graph'].map((node) => {
      if (typeof node === 'string') {
        return node
      }

      return node['@type']
    })

    expect(nodeTypes).toEqual([
      'WebSite',
      'WebApplication',
      'ResearchOrganization',
      'SoftwareSourceCode',
    ])

    const serialized = JSON.stringify(jsonLd)
    expect(serialized).not.toContain('sameAs')
    expect(serialized).not.toContain('offers')
    expect(serialized).toContain('https://github.com/NUDelta/pair-research')
  })
})
