/**
 * Format integer cents as a currency string (e.g., 1299 → "£12.99")
 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })
}
