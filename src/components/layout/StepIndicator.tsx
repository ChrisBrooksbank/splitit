import { useNavigate } from 'react-router-dom'
import { List, Users, Tag, Percent, CheckCircle2, type LucideIcon } from 'lucide-react'

interface Step {
  label: string
  route: string
  icon: LucideIcon
}

const STEPS: Step[] = [
  { label: 'Items', route: '/editor', icon: List },
  { label: 'People', route: '/people', icon: Users },
  { label: 'Assign', route: '/assign', icon: Tag },
  { label: 'Tips', route: '/tips', icon: Percent },
  { label: 'Done', route: '/summary', icon: CheckCircle2 },
]

interface StepIndicatorProps {
  currentRoute: string
}

export default function StepIndicator({ currentRoute }: StepIndicatorProps) {
  const navigate = useNavigate()
  const currentIndex = STEPS.findIndex((s) => s.route === currentRoute)

  // Don't render if this route isn't in the flow
  if (currentIndex === -1) return null

  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-0 px-4 pr-20 py-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        const stepContent = (
          <div className="flex flex-col items-center gap-1">
            <step.icon
              size={14}
              className={[
                'transition-all duration-300',
                isCompleted
                  ? 'text-gray-900 dark:text-gray-100'
                  : isCurrent
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
              aria-hidden="true"
            />
            <span
              className={[
                'text-[10px] font-medium leading-none transition-colors duration-300',
                isCurrent
                  ? 'text-gray-900 dark:text-gray-100'
                  : isCompleted
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {step.label}
            </span>
          </div>
        )

        return (
          <div key={step.route} className="flex items-center">
            {isCompleted ? (
              <button
                onClick={() => navigate(step.route)}
                className="cursor-pointer hover:opacity-70 transition-opacity"
                role="link"
                aria-label={`Go back to ${step.label}`}
              >
                {stepContent}
              </button>
            ) : (
              stepContent
            )}

            {/* Connector line between steps */}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-8 mx-1.5 mb-4 transition-all duration-300',
                  isCompleted ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-600',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
