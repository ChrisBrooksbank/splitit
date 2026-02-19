import type { AiProvider } from '../../store/apiKeyStore'

const PROMPT = `Read these restaurant bill/receipt photos and extract every line item. If there are multiple photos, they are parts of the same bill — combine them into one list and remove any duplicates from overlapping sections. Return ONLY a JSON object in this exact format, no other text:

{"items":[{"name":"Item Name","price":12.99,"qty":1}]}

Rules:
- price = the LINE TOTAL in £ as shown on the receipt (e.g. "2x Beer £11.00" → price: 11.00, qty: 2)
- qty = quantity (default 1)
- Omit subtotals, tax, tips, totals, payment lines — only food/drink items
- Use the exact item names from the receipt
- price is a number with 2 decimal places, in pounds sterling (not a string, no £ symbol)`

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function processReceiptWithAi(
  images: File[],
  provider: AiProvider,
  apiKey: string
): Promise<string> {
  const base64Images = await Promise.all(images.map(fileToBase64))

  if (provider === 'openai') {
    return callOpenAi(base64Images, apiKey)
  }
  if (provider === 'gemini') {
    return callGemini(base64Images, apiKey)
  }
  return callAnthropic(base64Images, apiKey)
}

async function callOpenAi(
  base64Images: string[],
  apiKey: string
): Promise<string> {
  const imageContent = base64Images.map((dataUrl) => ({
    type: 'image_url' as const,
    image_url: { url: dataUrl },
  }))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: PROMPT }, ...imageContent],
        },
      ],
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg =
      (body as { error?: { message?: string } }).error?.message ??
      `OpenAI API error (${response.status})`
    throw new Error(msg)
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  return data.choices[0].message.content
}

async function callAnthropic(
  base64Images: string[],
  apiKey: string
): Promise<string> {
  const imageContent = base64Images.map((dataUrl) => {
    const [meta, data] = dataUrl.split(',')
    const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mediaType,
        data,
      },
    }
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [...imageContent, { type: 'text', text: PROMPT }],
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg =
      (body as { error?: { message?: string } }).error?.message ??
      `Anthropic API error (${response.status})`
    throw new Error(msg)
  }

  const data = (await response.json()) as {
    content: { text: string }[]
  }
  return data.content[0].text
}

async function callGemini(
  base64Images: string[],
  apiKey: string
): Promise<string> {
  const imageParts = base64Images.map((dataUrl) => {
    const [meta, data] = dataUrl.split(',')
    const mimeType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
    return {
      inline_data: {
        mime_type: mimeType,
        data,
      },
    }
  })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, ...imageParts],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const msg =
      (body as { error?: { message?: string } }).error?.message ??
      `Gemini API error (${response.status})`
    throw new Error(msg)
  }

  const data = (await response.json()) as {
    candidates: { content: { parts: { text: string }[] } }[]
  }
  return data.candidates[0].content.parts[0].text
}
