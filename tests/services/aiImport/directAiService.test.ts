import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processReceiptWithAi } from '../../../src/services/aiImport/directAiService'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeFile(name = 'receipt.jpg'): File {
  return new File(['fake-image-data'], name, { type: 'image/jpeg' })
}

// Mock FileReader for base64 conversion
beforeEach(() => {
  vi.clearAllMocks()

  // Mock FileReader to return a predictable data URL
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
  describe('OpenAI provider', () => {
    it('calls OpenAI API with correct payload and returns response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"items":[{"name":"Beer","price":5.00,"qty":1}]}' } }],
        }),
      })

      const result = await processReceiptWithAi([makeFile()], 'openai', 'sk-test-key')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
      expect(options.headers.Authorization).toBe('Bearer sk-test-key')

      const body = JSON.parse(options.body)
      expect(body.model).toBe('gpt-4o')
      expect(body.messages[0].content).toHaveLength(2) // text + 1 image
      expect(body.messages[0].content[0].type).toBe('text')
      expect(body.messages[0].content[1].type).toBe('image_url')

      expect(result).toBe('{"items":[{"name":"Beer","price":5.00,"qty":1}]}')
    })

    it('sends multiple images in a single request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"items":[]}' } }],
        }),
      })

      await processReceiptWithAi(
        [makeFile('page1.jpg'), makeFile('page2.jpg')],
        'openai',
        'sk-test-key'
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      // 1 text + 2 images
      expect(body.messages[0].content).toHaveLength(3)
    })

    it('throws on API error with error message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      })

      await expect(processReceiptWithAi([makeFile()], 'openai', 'bad-key')).rejects.toThrow(
        'Invalid API key'
      )
    })

    it('throws generic error when response body cannot be parsed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      })

      await expect(processReceiptWithAi([makeFile()], 'openai', 'sk-key')).rejects.toThrow(
        'OpenAI API error (500)'
      )
    })
  })

  describe('Anthropic provider', () => {
    it('calls Anthropic API with correct payload and returns response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: '{"items":[{"name":"Salad","price":8.50,"qty":1}]}' }],
        }),
      })

      const result = await processReceiptWithAi([makeFile()], 'anthropic', 'sk-ant-test-key')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(options.headers['x-api-key']).toBe('sk-ant-test-key')
      expect(options.headers['anthropic-dangerous-direct-browser-access']).toBe('true')

      const body = JSON.parse(options.body)
      expect(body.model).toBe('claude-sonnet-4-20250514')
      // 1 image + 1 text
      expect(body.messages[0].content).toHaveLength(2)
      expect(body.messages[0].content[0].type).toBe('image')
      expect(body.messages[0].content[0].source.type).toBe('base64')
      expect(body.messages[0].content[1].type).toBe('text')

      expect(result).toBe('{"items":[{"name":"Salad","price":8.50,"qty":1}]}')
    })

    it('throws on Anthropic API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Forbidden' } }),
      })

      await expect(processReceiptWithAi([makeFile()], 'anthropic', 'bad-key')).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  describe('Gemini provider', () => {
    it('calls Gemini API with correct payload and returns response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: '{"items":[{"name":"Pizza","price":12.00,"qty":1}]}' }] },
            },
          ],
        }),
      })

      const result = await processReceiptWithAi([makeFile()], 'gemini', 'AIzaTestKey123')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('generativelanguage.googleapis.com')
      expect(url).toContain('key=AIzaTestKey123')

      const body = JSON.parse(options.body)
      // 1 text + 1 image
      expect(body.contents[0].parts).toHaveLength(2)
      expect(body.contents[0].parts[0].text).toBeDefined()
      expect(body.contents[0].parts[1].inline_data).toBeDefined()
      expect(body.contents[0].parts[1].inline_data.mime_type).toBe('image/jpeg')

      expect(result).toBe('{"items":[{"name":"Pizza","price":12.00,"qty":1}]}')
    })

    it('throws on Gemini API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'API key not valid' } }),
      })

      await expect(processReceiptWithAi([makeFile()], 'gemini', 'bad-key')).rejects.toThrow(
        'API key not valid'
      )
    })
  })
})
