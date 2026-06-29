'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './MessageBubble'
import { Message, Source, sendChatMessage } from '@/lib/api'

interface Props {
  documentIds: string[]
  conversationId?: string
  initialMessages?: Message[]
  onConversationId?: (id: string) => void
  onStreamComplete?: (resolvedConvId?: string) => void
  onJumpToPage?: (page: number) => void
}

interface StreamingMessage {
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  id: string
}

export function ChatPanel({
  documentIds,
  conversationId: initialConvId,
  initialMessages = [],
  onConversationId,
  onStreamComplete,
  onJumpToPage,
}: Props) {
  const [messages, setMessages] = useState<(Message | StreamingMessage)[]>(initialMessages)
  const [convId, setConvId] = useState(initialConvId)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  // Hydrate messages from DB when React Query resolves after the first render.
  // Use functional update so we never overwrite messages that were added during streaming.
  useEffect(() => {
    setMessages((prev) => (prev.length === 0 && initialMessages.length > 0 ? initialMessages : prev))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages])

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setError('')

    const userMsg: StreamingMessage = { id: crypto.randomUUID(), role: 'user', content: text, sources: [] }
    const assistantMsg: StreamingMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', sources: [] }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    // Capture the resolved conversation ID in a local var so onStreamComplete
    // gets the correct value even though the parent closure captures a stale convId.
    let resolvedConvId: string | undefined = convId

    await sendChatMessage(text, documentIds, {
      onConversationId: (id) => {
        resolvedConvId = id
        setConvId(id)
        onConversationId?.(id)
      },
      onToken: (token) => {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1] as StreamingMessage
          copy[copy.length - 1] = { ...last, content: last.content + token }
          return copy
        })
      },
      onSources: (sources) => {
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1] as StreamingMessage
          copy[copy.length - 1] = { ...last, sources }
          return copy
        })
      },
      onDone: () => setStreaming(false),
      onError: (msg) => {
        setError(msg)
        setStreaming(false)
        setMessages((prev) => prev.slice(0, -1))
      },
    }, convId)

    onStreamComplete?.(resolvedConvId)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm">
            Ask a question about your document
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg as Message}
            onJump={onJumpToPage}
          />
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 bg-background">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50 min-h-[40px] max-h-[160px] overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`
            }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!input.trim() || streaming}
            className="shrink-0 h-10 w-10"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
