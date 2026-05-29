import type { Graph, Thing, WithContext } from 'schema-dts'
import { SITE_BASE_URL } from '@/shared/config/constants'
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_IMAGE_ALT,
  SEO_DEFAULT_IMAGE_HEIGHT,
  SEO_DEFAULT_IMAGE_PATH,
  SEO_DEFAULT_IMAGE_WIDTH,
  SEO_DEFAULT_KEYWORDS,
  SEO_DEFAULT_TITLE,
  SEO_INDEX_ROBOTS,
  SEO_SITE_NAME,
} from './config'

type StructuredData = Graph | WithContext<Thing>

interface SeoHeadOptions {
  title?: string
  description?: string
  path?: string
  robots?: string
  imagePath?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
  keywords?: readonly string[]
  type?: 'website' | 'article'
  jsonLd?: StructuredData
}

export function buildAbsoluteUrl(path = '/') {
  if (SITE_BASE_URL === '') {
    return path
  }

  const url = new URL(path, SITE_BASE_URL)
  return url.toString()
}

export function buildPageTitle(title?: string) {
  if (title === undefined || title.trim() === '' || title === SEO_DEFAULT_TITLE) {
    return SEO_DEFAULT_TITLE
  }

  return `${title} | ${SEO_SITE_NAME}`
}

export function buildSeoHead({
  title,
  description = SEO_DEFAULT_DESCRIPTION,
  path = '/',
  robots = SEO_INDEX_ROBOTS,
  imagePath = SEO_DEFAULT_IMAGE_PATH,
  imageAlt = SEO_DEFAULT_IMAGE_ALT,
  imageWidth = SEO_DEFAULT_IMAGE_WIDTH,
  imageHeight = SEO_DEFAULT_IMAGE_HEIGHT,
  keywords = SEO_DEFAULT_KEYWORDS,
  type = 'website',
  jsonLd,
}: SeoHeadOptions = {}) {
  const pageTitle = buildPageTitle(title)
  const canonicalUrl = buildAbsoluteUrl(path)
  const imageUrl = buildAbsoluteUrl(imagePath)
  const keywordContent = keywords.map(keyword => keyword.trim()).filter(Boolean).join(', ')
  const meta: Array<Record<string, unknown>> = [
    { title: pageTitle },
    { name: 'description', content: description },
    ...(keywordContent === '' ? [] : [{ name: 'keywords', content: keywordContent }]),
    { name: 'robots', content: robots },
    { property: 'og:type', content: type },
    { property: 'og:locale', content: 'en_US' },
    { property: 'og:site_name', content: SEO_SITE_NAME },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:alt', content: imageAlt },
    { property: 'og:image:width', content: imageWidth.toString() },
    { property: 'og:image:height', content: imageHeight.toString() },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: imageAlt },
  ]

  if (jsonLd !== undefined) {
    meta.push({ 'script:ld+json': jsonLd })
  }

  return {
    meta,
    links: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  }
}

export function buildRootSeoMeta() {
  return [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'application-name', content: SEO_SITE_NAME },
    { name: 'theme-color', content: '#ffffff' },
    { name: 'color-scheme', content: 'light' },
    { title: SEO_DEFAULT_TITLE },
    { name: 'description', content: SEO_DEFAULT_DESCRIPTION },
  ]
}
