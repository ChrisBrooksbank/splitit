import type { Person } from '../../types'

interface PersonChipProps {
  person: Person
  className?: string
}

export default function PersonChip({ person, className = '' }: PersonChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white max-w-[10rem] ${className}`}
      style={{ backgroundColor: person.color }}
      aria-label={person.name}
      title={person.name}
    >
      <span className="truncate">{person.name}</span>
    </span>
  )
}
