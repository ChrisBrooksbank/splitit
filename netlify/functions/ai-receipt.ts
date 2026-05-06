type AiProvider = 'openai' | 'anthropic' | 'gemini'

interface AiReceiptRequest {
  provider: AiProvider
  apiKey: string
  images: string[]
  prompt: string
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  })
}

function isAiProvider(value: unknown): value is AiProvider {
  return value === 'openai' || value === 'anthropic' || value === 'gemini'
}

function parseDataUrl(dataUrl: string): { data: string; mimeType: string } {
  const [meta, data] = dataUrl.split(',')
  const mimeType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  return { data, mimeType }
}

async function parseRequest(req: Request): Promise<AiReceiptRequest> {
  const body = (await req.json()) as Partial<AiReceiptRequest>

  if (!isAiProvider(body.provider)) {
    throw new Error('Choose a supported AI provider.')
  }
  if (typeof body.apiKey !== 'string' || body.apiKey.trim().length === 0) {
    throw new Error('Add an API key before processing with AI.')
  }
  if (!Array.isArray(body.images) || body.images.length === 0) {
    throw new Error('Add at least one receipt photo.')
  }
  if (!body.images.every((image) => typeof image === 'string' && image.startsWith('data:image/'))) {
    throw new Error('Receipt photos must be image data URLs.')
  }
  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    throw new Error('Missing AI prompt.')
  }

  return {
    provider: body.provider,
    apiKey: body.apiKey,
    images: body.images,
    prompt: body.prompt,
  }
}

async function callOpenAi({ images, apiKey, prompt }: AiReceiptRequest): Promise<string> {
  const imageContent = images.map((dataUrl) => ({
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
          content: [{ type: 'text', text: prompt }, ...imageContent],
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
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned an empty response.')
  return text
}

async function callAnthropic({ images, apiKey, prompt }: AiReceiptRequest): Promise<string> {
  const imageContent = images.map((dataUrl) => {
    const { data, mimeType } = parseDataUrl(dataUrl)
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mimeType,
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
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [...imageContent, { type: 'text', text: prompt }],
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
    content?: { text?: string }[]
  }
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned an empty response.')
  return text
}

async function callGemini({ images, apiKey, prompt }: AiReceiptRequest): Promise<string> {
  const imageParts = images.map((dataUrl) => {
    const { data, mimeType } = parseDataUrl(dataUrl)
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
            parts: [{ text: prompt }, ...imageParts],
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
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const request = await parseRequest(req)
    const text =
      request.provider === 'openai'
        ? await callOpenAi(request)
        : request.provider === 'anthropic'
          ? await callAnthropic(request)
          : await callGemini(request)

    return jsonResponse({ text })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'AI request failed.' }, 400)
  }
}

export const config = {
  path: '/api/ai-receipt',
  method: ['POST'],
}
