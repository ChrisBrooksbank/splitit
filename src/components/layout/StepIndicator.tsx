interface Step {
  label: string
  route: string
}

const STEPS: Step[] = [
  { label: 'Items', route: '/editor' },
  { label: 'People', route: '/people' },
  { label: 'Assign', route: '/assign' },
  { label: 'Tips', route: '/tips' },
  { label: 'Done', route: '/summary' },
]

interface StepIndicatorProps {
  currentRoute: string
}

export default function StepIndicator({ currentRoute }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.route === currentRoute)

  // Don't render if this route isn't in the flow
  if (currentIndex === -1) return null

  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-0 px-4 py-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.route} className="flex items-center">
            {/* Step dot + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-2 h-2 rounded-full transition-all duration-300',
                  isCompleted ? 'bg-gray-900' : isCurrent ? 'bg-gray-900' : 'bg-gray-300',
                ].join(' ')}
                aria-hidden="true"
              />
              <span
                className={[
                  'text-[10px] font-medium leading-none transition-colors duration-300',
                  isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-500' : 'text-gray-300',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-8 mx-1.5 mb-3.5 transition-all duration-300',
                  isCompleted ? 'bg-gray-900' : 'bg-gray-200',
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
