'use client'

import { Badge } from '@/components/ui/badge'
import { Source } from '@/lib/api'

interface Props {
  source: Source
  onJump?: (page: number) => void
}

export function CitationChip({ source, onJump }: Props) {
  return (
    <button
      onClick={() => onJump?.(source.page_number)}
      className="inline-flex"
      title={`${source.filename}, page ${source.page_number}`}
    >
      <Badge
        variant="secondary"
        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[11px] h-5 px-1.5"
      >
        p.{source.page_number} · {source.filename}
      </Badge>
    </button>
  )
}
