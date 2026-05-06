export const AI_RECEIPT_PROMPT = `Read these UK restaurant bill/receipt photos and extract the food and drink line items for a bill-splitting app. If there are multiple photos, they are parts of the same bill — combine them into one list and remove duplicates from overlapping sections.

Return ONLY valid JSON in this exact shape, with no markdown and no extra text:

{"items":[{"name":"Item Name","price":12.99,"qty":1}]}

Rules:
- Currency is GBP. Treat £, GBP, and plain receipt prices as pounds sterling.
- Include only food and drink items, plus paid item modifiers/add-ons that are separately priced (for example "Extra cheese £1.50").
- Exclude subtotal, total, balance due, VAT/tax, service charge, gratuity, tip, delivery/booking/card fees, discounts, vouchers, coupons, payment lines (including card/contactless/cash/Visa), change, table/order numbers, and merchant details.
- price must be the LINE TOTAL in pounds, not the unit price. Example: "2x Beer £11.00" -> {"name":"Beer","price":11.00,"qty":2}.
- qty must be an integer quantity. Default to 1 when no quantity is shown.
- Use the exact item names from the receipt, but remove quantity prefixes such as "2x" from the name.
- Do not invent items that are not visible. If a line is unreadable, omit it rather than guessing.
- Preserve intentional repeated items only when they appear as separate purchases. Deduplicate only repeated lines caused by overlapping photos.
- price must be a JSON number with exactly the receipt value in pounds, no £ symbol and no string values.`
