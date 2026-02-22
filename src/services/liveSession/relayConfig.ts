export const RELAY_URL =
  import.meta.env.VITE_RELAY_URL ?? 'wss://splitit-relay.chrisbrooksbank.deno.net'
export const CONNECT_TIMEOUT_MS = 10_000
export const MAX_RETRIES = 3
export const BASE_DELAY_MS = 2_000

export function retryDelayMs(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt)
}
