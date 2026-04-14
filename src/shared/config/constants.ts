// Global Constants
import { z } from 'zod'

const siteBaseUrlSchema = z.string().url().nonempty()
const parsedSiteBaseUrl = siteBaseUrlSchema.safeParse(import.meta.env.VITE_SITE_BASE_URL ?? '')

// ! NO trailing slash at the end of the URL
export const SITE_BASE_URL
  = import.meta.env.DEV
    ? 'http://localhost:3000'
    : parsedSiteBaseUrl.success ? parsedSiteBaseUrl.data : ''

// Supabase Storage S3 Client
export const S3_REGION = 'us-east-2'
export const S3_BASE_URL = 'https://wsyxagqdafqkymhzoohe.supabase.co/storage/v1'
export const BUCKET = 'avatars'

// Avatar Size Limitations
// ! [Note]: This is the limitation for the user to upload.
// ! However, all their uploaded images will be auto-optimized to smaller sizes.
export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
