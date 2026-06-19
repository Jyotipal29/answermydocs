'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { PDFViewer } from '@/components/chat/PDFViewer'
import { conversationsApi, documentsApi } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ doc?: string }>
}

export default function ChatPage({ params, searchParams }: Props) {
  const { id } = use(params)
  const { doc: docIdParam } = use(searchParams)

  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const [jumpPage, setJumpPage] = useState<number | undefined>()
  const [convId, setConvId] = useState<string | undefined>(id !== 'new' ? id : undefined)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading])

  const { data: conversation } = useQuery({
    queryKey: ['conversation', convId],
    queryFn: () => conversationsApi.get(convId!).then((r) => r.data),
    enabled: !!convId && convId !== 'new',
  })

  const initialMessages = useMemo(() => conversation?.messages ?? [], [conversation])

  const docIds: string[] = conversation?.document_id
    ? [conversation.document_id]
    : docIdParam
      ? [docIdParam]
      : []

  const primaryDocId = docIds[0]

  const { data: document } = useQuery({
    queryKey: ['document', primaryDocId],
    queryFn: () => documentsApi.get(primaryDocId!).then((r) => r.data),
    enabled: !!primaryDocId,
  })

  const pdfUrl = primaryDocId
    ? `${process.env.NEXT_PUBLIC_API_URL}/documents/${primaryDocId}/file`
    : undefined

  if (isLoading) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      {/* Chat panel */}
      <div className="flex flex-col border-r border-border" style={{ width: '420px', minWidth: '320px' }}>
        <div className="px-4 py-3 border-b border-border shrink-0">
          <p className="text-sm font-medium truncate">
            {conversation?.title || document?.filename || 'New chat'}
          </p>
          {document && (
            <p className="text-xs text-muted-foreground truncate">{document.filename}</p>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel
            key={convId ?? 'new'}
            documentIds={docIds}
            conversationId={convId}
            initialMessages={initialMessages}
            onConversationId={(newId) => {
              setConvId(newId)
              if (id === 'new') router.replace(`/chat/${newId}`, { scroll: false })
            }}
            onJumpToPage={setJumpPage}
          />
        </div>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 min-w-0">
        {pdfUrl ? (
          <PDFViewer url={pdfUrl} targetPage={jumpPage} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a document to preview it here
          </div>
        )}
      </div>
    </div>
  )
}
