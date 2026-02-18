/**
 * Gemini Flash vision service for receipt OCR.
 * Sends an image to Google's Gemini API and requests structured JSON output.
 * Returns a ParsedReceipt directly — no regex parsing needed.
 */

import { nanoid } from 'nanoid'
import type { ParsedReceipt } from './receiptParser'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const RECEIPT_PROMPT = `You are a receipt OCR assistant. Analyze this receipt image and extract all line items.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "lineItems": [
    { "name": "Item name", "price": 12.99, "quantity": 1 }
  ],
  "subtotal": 25.98,
  "tax": 2.08,
  "total": 28.06
}

Rules:
- "price" is the unit price in dollars (e.g. 12.99), NOT cents
- If a line shows "2x Soup $16.00", the unit price is 8.00 and quantity is 2
- Set subtotal/tax/total to null if not visible on the receipt
- Do NOT include metadata lines (tip, payment, change, discount) as line items
- Do NOT include section headers, separators, or greetings
- Include ALL food/drink items visible on the receipt`

/**
 * Convert a File or Blob to a base64 data string for the Gemini API.
 */
async function toBase64(image: File | Blob): Promise<{ data: string; mimeType: string }> {
  const buffer = await image.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return {
    data: btoa(binary),
    mimeType: image.type || 'image/jpeg',
  }
}

export interface GeminiResult {
  lineItems: { name: string; price: number; quantity: number }[]
  subtotal: number | null
  tax: number | null
  total: number | null
}

/**
 * Call Gemini Flash to extract receipt data from an image.
 *
 * @param image - The receipt image (original, not preprocessed — Gemini handles its own vision)
 * @param apiKey - The user's Gemini API key
 * @returns Parsed receipt data
 * @throws On network error, invalid API key, rate limit, or unparseable response
 */
export async function recognizeWithGemini(
  image: File | Blob,
  apiKey: string
): Promise<ParsedReceipt> {
  const { data, mimeType } = await toBase64(image)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: RECEIPT_PROMPT },
            {
              inlineData: {
                mimeType,
                data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Gemini API key. Check your key in Settings.')
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit reached. Falling back to local OCR.')
    }
    throw new Error(`Gemini API error (${response.status}): ${errorBody.slice(0, 200)}`)
  }

  const json = await response.json()

  // Extract text from Gemini response
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  // Parse the JSON from the response (strip markdown fences if present)
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  let parsed: GeminiResult

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse Gemini response as JSON')
  }

  // Validate and convert to ParsedReceipt
  if (!Array.isArray(parsed.lineItems)) {
    throw new Error('Gemini response missing lineItems array')
  }

  return {
    lineItems: parsed.lineItems
      .filter((item) => item.name && typeof item.price === 'number' && item.price > 0)
      .map((item) => ({
        id: nanoid(),
        name: item.name.trim(),
        price: Math.round(item.price * 100), // convert dollars to cents
        quantity: item.quantity > 0 ? item.quantity : 1,
        confidence: 0.9, // high but not 1.0 (that's reserved for manual)
        manuallyEdited: false,
      })),
    detectedSubtotal:
      typeof parsed.subtotal === 'number' ? Math.round(parsed.subtotal * 100) : null,
    detectedTax: typeof parsed.tax === 'number' ? Math.round(parsed.tax * 100) : null,
    detectedTotal: typeof parsed.total === 'number' ? Math.round(parsed.total * 100) : null,
  }
}
