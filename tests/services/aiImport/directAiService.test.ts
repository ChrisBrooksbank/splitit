import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processReceiptWithAi } from '../../../src/services/aiImport/directAiService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeFile(name = 'receipt.jpg'): File {
  return new File(['fake-image-data'], name, { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.clearAllMocks()

  vi.stubGlobal(
    'FileReader',
    class {
      result: string | null = null
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,dGVzdA=='
        this.onload?.()
      }
    }
  )
})

describe('processReceiptWithAi', () => {
  it('calls the AI proxy with correct payload and returns response text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ text: '{"items":[{"name":"Beer","price":5.00,"qty":1}]}' }),
    })

    const result = await processReceiptWithAi([makeFile()], 'openai', 'sk-test-key')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/ai-receipt')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body.provider).toBe('openai')
    expect(body.apiKey).toBe('sk-test-key')
    expect(body.images).toEqual(['data:image/jpeg;base64,dGVzdA=='])
    expect(body.prompt).toContain('Read these restaurant bill/receipt photos')

    expect(result).toBe('{"items":[{"name":"Beer","price":5.00,"qty":1}]}')
  })

  it('sends multiple images in a single proxy request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ text: '{"items":[]}' }),
    })

    await processReceiptWithAi(
      [makeFile('page1.jpg'), makeFile('page2.jpg')],
      'openai',
      'sk-test-key'
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.images).toHaveLength(2)
  })

  it.each([
    ['anthropic', 'sk-ant-test-key'],
    ['gemini', 'AIzaTestKey123'],
  ] as const)('sends %s provider selection to the AI proxy', async (provider, apiKey) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ text: '{"items":[{"name":"Salad","price":8.50,"qty":1}]}' }),
    })

    await processReceiptWithAi([makeFile()], provider, apiKey)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.provider).toBe(provider)
    expect(body.apiKey).toBe(apiKey)
  })

  it('routes existing Claude keys to the Anthropic provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ text: '{"items":[]}' }),
    })

    await processReceiptWithAi([makeFile()], 'openai', 'sk-ant-test-key')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.provider).toBe('anthropic')
  })

  it('throws on API error with error message from proxy response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Invalid API key' }),
    })

    await expect(processReceiptWithAi([makeFile()], 'openai', 'bad-key')).rejects.toThrow(
      'Invalid API key'
    )
  })

  it('throws generic error when response body cannot be parsed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => {
        throw new Error('not json')
      },
    })

    await expect(processReceiptWithAi([makeFile()], 'openai', 'sk-key')).rejects.toThrow(
      'AI service error (500)'
    )
  })

  it('throws when the proxy returns a non-json success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html></html>',
    })

    await expect(processReceiptWithAi([makeFile()], 'openai', 'sk-key')).rejects.toThrow(
      'AI service returned an invalid response.'
    )
  })
})
