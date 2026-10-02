/**
 * Convert a receipt line (name, line total, quantity) into the app's unit-price model.
 *
 * The app stores a unit price, so a line total that doesn't divide evenly by the quantity
 * (e.g. 3 for £10.00) would lose cents. In that case keep the exact total as a single
 * item and note the quantity in the name instead.
 */
export function toUnitPricing(
  name: string,
  lineTotalCents: number,
  quantity: number
): { name: string; price: number; quantity: number } {
  if (quantity <= 1) return { name, price: lineTotalCents, quantity: 1 }
  if (lineTotalCents % quantity === 0) {
    return { name, price: lineTotalCents / quantity, quantity }
  }
  return { name: `${name} (×${quantity})`, price: lineTotalCents, quantity: 1 }
}
