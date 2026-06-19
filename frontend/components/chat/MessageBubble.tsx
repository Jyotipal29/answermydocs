import { Message, Source } from '@/lib/api'
import { CitationChip } from './CitationChip'

interface Props {
  message: Message
  onJump?: (page: number) => void
}

export function MessageBubble({ message, onJump }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
        ].join(' ')}
      >
        {message.content}
      </div>

      {!isUser && message.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {message.sources.map((s: Source, i: number) => (
            <CitationChip key={`${s.doc_id}-${s.page_number}-${i}`} source={s} onJump={onJump} />
          ))}
        </div>
      )}
    </div>
  )
}
