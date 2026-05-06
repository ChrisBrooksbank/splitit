import type { AiProvider } from '../../store/apiKeyStore'
import { AI_RECEIPT_PROMPT } from './receiptPrompt'

const MAX_RAW_IMAGE_BYTES = 1_500_000
const MAX_AI_IMAGE_SIZE = 1400
const AI_JPEG_QUALITY = 0.75

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function resizeFileForAi(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  const img = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image for AI processing'))
      img.src = objectUrl
    })

    const scale = Math.min(MAX_AI_IMAGE_SIZE / img.width, MAX_AI_IMAGE_SIZE / img.height, 1)
    const width = Math.max(1, Math.round(img.width * scale))
    const height = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare image for AI processing')

    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', AI_JPEG_QUALITY)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function fileToBase64(file: File): Promise<string> {
  if (file.size <= MAX_RAW_IMAGE_BYTES) {
    return readFileAsDataUrl(file)
  }

  try {
    return await resizeFileForAi(file)
  } catch {
    return readFileAsDataUrl(file)
  }
}

export async function processReceiptWithAi(
  images: File[],
  provider: AiProvider,
  apiKey: string
): Promise<string> {
  const base64Images = await Promise.all(images.map(fileToBase64))
  const inferredProvider = apiKey.trim().startsWith('sk-ant-') ? 'anthropic' : provider

  const response = await fetch('/api/ai-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: inferredProvider,
      apiKey,
      images: base64Images,
      prompt: AI_RECEIPT_PROMPT,
    }),
  })

  const contentType = response.headers?.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? ((await response.json().catch(() => ({}))) as { text?: string; error?: string })
    : { error: await response.text().catch(() => '') }

  if (!response.ok) {
    throw new Error(body.error || `AI service error (${response.status})`)
  }

  if (!body.text) {
    throw new Error('AI service returned an invalid response.')
  }

  return body.text
}
