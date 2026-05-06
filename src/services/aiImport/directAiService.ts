import type { AiProvider } from '../../store/apiKeyStore'

const MAX_RAW_IMAGE_BYTES = 1_500_000
const MAX_AI_IMAGE_SIZE = 1400
const AI_JPEG_QUALITY = 0.75

const PROMPT = `Read these restaurant bill/receipt photos and extract every line item. If there are multiple photos, they are parts of the same bill — combine them into one list and remove any duplicates from overlapping sections. Return ONLY a JSON object in this exact format, no other text:

{"items":[{"name":"Item Name","price":12.99,"qty":1}]}

Rules:
- price = the LINE TOTAL in £ as shown on the receipt (e.g. "2x Beer £11.00" → price: 11.00, qty: 2)
- qty = quantity (default 1)
- Omit subtotals, tax, tips, totals, payment lines — only food/drink items
- Use the exact item names from the receipt
- price is a number with 2 decimal places, in pounds sterling (not a string, no £ symbol)`

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
      prompt: PROMPT,
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
