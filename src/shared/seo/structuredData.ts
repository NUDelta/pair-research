import type { Graph, WebPage, WebSite, WithContext } from 'schema-dts'
import { buildAbsoluteUrl } from './head'

const GITHUB_REPOSITORY_URL = 'https://github.com/NUDelta/pair-research'

export function buildWebSiteJsonLd(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': buildAbsoluteUrl('/#website'),
    'name': 'Pair Research',
    'url': buildAbsoluteUrl('/'),
    'description': 'A collaboration app for structured peer support in research and classroom groups.',
    'publisher': {
      '@id': buildAbsoluteUrl('/#delta-lab'),
    },
  }
}

export function buildPairResearchJsonLd(): Graph {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': buildAbsoluteUrl('/#website'),
        'name': 'Pair Research',
        'url': buildAbsoluteUrl('/'),
        'description': 'A collaboration app for structured peer support in research and classroom groups.',
        'publisher': {
          '@id': buildAbsoluteUrl('/#delta-lab'),
        },
      },
      {
        '@type': 'WebApplication',
        '@id': buildAbsoluteUrl('/#app'),
        'name': 'Pair Research',
        'applicationCategory': 'EducationalApplication',
        'browserRequirements': 'Requires a modern web browser with JavaScript enabled.',
        'operatingSystem': 'Web',
        'url': buildAbsoluteUrl('/'),
        'description': 'Pair Research matches group members so they can help each other move past blockers.',
        'creator': {
          '@id': buildAbsoluteUrl('/#delta-lab'),
        },
        'maintainer': {
          '@id': buildAbsoluteUrl('/#delta-lab'),
        },
        'isBasedOn': {
          '@id': buildAbsoluteUrl('/#source-code'),
        },
      },
      {
        '@type': 'ResearchOrganization',
        '@id': buildAbsoluteUrl('/#delta-lab'),
        'name': 'Delta Lab',
        'url': 'https://delta.northwestern.edu/',
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': buildAbsoluteUrl('/#source-code'),
        'name': 'Pair Research source code',
        'codeRepository': GITHUB_REPOSITORY_URL,
        'programmingLanguage': 'TypeScript',
        'runtimePlatform': 'Web',
        'targetProduct': {
          '@id': buildAbsoluteUrl('/#app'),
        },
        'creator': {
          '@id': buildAbsoluteUrl('/#delta-lab'),
        },
      },
    ],
  }
}

export function buildLegalPageJsonLd({
  title,
  path,
  effectiveDate,
}: {
  title: string
  path: string
  effectiveDate: string
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': title,
    'url': buildAbsoluteUrl(path),
    'dateModified': effectiveDate,
    'isPartOf': {
      '@type': 'WebSite',
      'name': 'Pair Research',
      'url': buildAbsoluteUrl('/'),
    },
  }
}
