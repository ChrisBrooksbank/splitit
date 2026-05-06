import { describe, it, expect, vi, beforeEach } from 'vitest'
import aiReceiptFunction from '../../netlify/functions/ai-receipt'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const requestBody = {
  provider: 'anthropic',
  apiKey: 'sk-ant-test-key',
  images: ['data:image/jpeg;base64,dGVzdA=='],
  prompt: 'Read this receipt',
}

function makeRequest(body: unknown): Request {
  return new Request('https://splitit.test/api/ai-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ai-receipt Netlify function', () => {
  it('uses the current Claude Sonnet model for Anthropic requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: '{"items":[]}' }] }),
    })

    const response = await aiReceiptFunction(makeRequest(requestBody))

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(options.headers['x-api-key']).toBe('sk-ant-test-key')

    const body = JSON.parse(options.body)
    expect(body.model).toBe('claude-sonnet-4-6')
    expect(body.model).not.toBe('claude-sonnet-4-20250514')
  })
})
