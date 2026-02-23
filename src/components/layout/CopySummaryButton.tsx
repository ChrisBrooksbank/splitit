import { useState, useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { useBillStore } from '../../store/billStore'
import { usePeopleStore } from '../../store/peopleStore'
import { useAssignmentStore } from '../../store/assignmentStore'
import { useTipStore } from '../../store/tipStore'
import { calculateSplit } from '../../services/calculator/splitCalculator'
import { buildShareText } from '../../utils/buildShareText'

/**
 * A small header button that copies a text summary of the current bill state
 * to the clipboard. Adapts its output based on what data is available at each
 * stage of the flow.
 */
export default function CopySummaryButton() {
  const { lineItems } = useBillStore()
  const { people } = usePeopleStore()
  const { assignments, portions } = useAssignmentStore()
  const { personTips } = useTipStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (lineItems.length === 0) return

    const hasAssignments = Object.values(assignments).some((ids) => ids.length > 0)
    const hasTips = Object.keys(personTips).length > 0

    let personTotals
    let grandTotal
    if (people.length > 0 && hasAssignments && hasTips) {
      const result = calculateSplit({
        people,
        lineItems,
        assignments,
        portions,
        personTips,
      })
      personTotals = result.personTotals
      grandTotal = result.grandTotal
    }

    const text = buildShareText({
      lineItems,
      people: people.length > 0 ? people : undefined,
      assignments: hasAssignments ? assignments : undefined,
      portions,
      personTotals,
      grandTotal,
    })

    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard write failed silently
    })

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [lineItems, people, assignments, portions, personTips])

  if (lineItems.length === 0) return null

  return (
    <button
      onClick={handleCopy}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 active:scale-95 transition-transform flex-shrink-0"
      aria-label={copied ? 'Summary copied to clipboard' : 'Copy bill summary to clipboard'}
    >
      {copied ? (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">✓</span>
      ) : (
        <Share2 size={18} className="text-gray-700 dark:text-gray-300" />
      )}
    </button>
  )
}
