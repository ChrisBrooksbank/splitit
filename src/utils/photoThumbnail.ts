const MAX_THUMB_SIZE = 300 // px — longest edge
const JPEG_QUALITY = 0.6
const MAX_VIEW_SIZE = 1200 // px — longest edge for viewable photos
const VIEW_JPEG_QUALITY = 0.7

/**
 * Resize a photo to a small thumbnail and return a base64 data URL.
 * Works with File objects, blob URLs, or existing data URLs.
 */
export async function createThumbnailDataUrl(source: File | string): Promise<string> {
  const img = new Image()
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : source

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'))
    img.src = objectUrl
  })

  if (source instanceof File) {
    URL.revokeObjectURL(objectUrl)
  }

  // Calculate scaled dimensions
  const { width, height } = img
  const scale = Math.min(MAX_THUMB_SIZE / width, MAX_THUMB_SIZE / height, 1)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/**
 * Resize a photo to a viewable size (1200px max) and return a base64 data URL.
 * Larger than thumbnails but still manageable for sessionStorage.
 */
export async function createViewableDataUrl(source: File | string): Promise<string> {
  const img = new Image()
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : source

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image for viewable photo'))
    img.src = objectUrl
  })

  if (source instanceof File) {
    URL.revokeObjectURL(objectUrl)
  }

  const { width, height } = img
  const scale = Math.min(MAX_VIEW_SIZE / width, MAX_VIEW_SIZE / height, 1)
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  return canvas.toDataURL('image/jpeg', VIEW_JPEG_QUALITY)
}

/** Key used in sessionStorage to pass receipt photos between pages */
export const RECEIPT_PHOTOS_KEY = 'receiptPhotos'

/** Store photo data URLs in sessionStorage */
export function storeReceiptPhotos(dataUrls: string[]): void {
  if (dataUrls.length > 0) {
    sessionStorage.setItem(RECEIPT_PHOTOS_KEY, JSON.stringify(dataUrls))
  }
}

/** Read and remove receipt photos from sessionStorage */
export function consumeReceiptPhotos(): string[] | null {
  const raw = sessionStorage.getItem(RECEIPT_PHOTOS_KEY)
  if (!raw) return null
  sessionStorage.removeItem(RECEIPT_PHOTOS_KEY)
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return null
  }
}

/** Peek at receipt photos without consuming them */
export function peekReceiptPhotos(): string[] | null {
  const raw = sessionStorage.getItem(RECEIPT_PHOTOS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return null
  }
}

/** Key used in sessionStorage for viewable-size receipt photos */
export const RECEIPT_VIEWS_KEY = 'receiptViewPhotos'

/** Store viewable-size photo data URLs in sessionStorage */
export function storeReceiptViewPhotos(dataUrls: string[]): void {
  if (dataUrls.length > 0) {
    sessionStorage.setItem(RECEIPT_VIEWS_KEY, JSON.stringify(dataUrls))
  }
}

/** Peek at viewable receipt photos without consuming them */
export function peekReceiptViewPhotos(): string[] | null {
  const raw = sessionStorage.getItem(RECEIPT_VIEWS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return null
  }
}
