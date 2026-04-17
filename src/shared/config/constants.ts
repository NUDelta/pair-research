// Global Constants
import { z } from 'zod'

const siteBaseUrlSchema = z.string().url().nonempty()
const parsedSiteBaseUrl = siteBaseUrlSchema.safeParse(import.meta.env.VITE_SITE_BASE_URL ?? '')

// ! NO trailing slash at the end of the URL
export const SITE_BASE_URL
  = import.meta.env.DEV
    ? 'http://localhost:3000'
    : parsedSiteBaseUrl.success ? parsedSiteBaseUrl.data : ''

// Avatar Size Limitations
// ! [Note]: This is the limitation for the user to upload.
// ! However, all their uploaded images will be auto-optimized to smaller sizes.
export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
