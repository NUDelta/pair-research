import { buildAbsoluteUrl } from './head'

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Pair Research',
    'url': buildAbsoluteUrl('/'),
    'logo': buildAbsoluteUrl('/images/logo.webp'),
    'sameAs': [
      'https://delta.northwestern.edu/',
    ],
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Pair Research',
    'url': buildAbsoluteUrl('/'),
    'description': 'A collaboration app for structured peer support in research and classroom groups.',
    'publisher': {
      '@type': 'Organization',
      'name': 'Delta Lab',
      'url': 'https://delta.northwestern.edu/',
    },
  }
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Pair Research',
    'applicationCategory': 'EducationalApplication',
    'operatingSystem': 'Web',
    'url': buildAbsoluteUrl('/'),
    'description': 'Pair Research matches group members so they can help each other move past blockers.',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
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
}) {
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
