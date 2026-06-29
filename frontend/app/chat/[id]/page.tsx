'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { Loader2, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/layout/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'

// pdf.js uses DOMMatrix at module-evaluation time, which doesn't exist in Node.js.
// Dynamic import with ssr:false ensures it only runs in the browser.
const PDFViewer = dynamic(
  () => import('@/components/chat/PDFViewer').then((m) => m.PDFViewer),
  { ssr: false },
)
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { toast } from 'sonner'
import { conversationsApi, documentsApi } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ doc?: string }>
}

export default function ChatPage({ params, searchParams }: Props) {
  const { id } = use(params)
  const { doc: docIdParam } = use(searchParams)

  const { user, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [jumpPage, setJumpPage] = useState<number | undefined>()
  const [convId, setConvId] = useState<string | undefined>(id !== 'new' ? id : undefined)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading])

  const { data: conversation, isLoading: convLoading, isError: convError } = useQuery({
    queryKey: ['conversation', convId],
    queryFn: () => conversationsApi.get(convId!).then((r) => r.data),
    enabled: !!convId && convId !== 'new',
    retry: false,
  })

  useEffect(() => {
    if (convError) {
      toast.error("This conversation's document was deleted.")
      router.replace('/dashboard')
    }
  }, [convError, router])

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

  if (authLoading) {
    return (
      <div className="dark flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex-1 flex overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        {/* Chat panel */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex flex-col h-full">
            <div className="px-3 py-3 border-b border-border shrink-0 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conversation?.title || document?.filename || 'New chat'}
                </p>
                {document && (
                  <p className="text-xs text-muted-foreground truncate">{document.filename}</p>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {/* Only show the "Loading conversation…" spinner when navigating to an
                  EXISTING conversation (id !== 'new'). When id === 'new' the user may
                  be mid-stream — unmounting ChatPanel here loses all streamed tokens. */}
              {convId && convLoading && id !== 'new' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Loading conversation…</p>
                  </div>
                </div>
              ) : (
                <ChatPanel
                  key={id}
                  documentIds={docIds}
                  conversationId={convId}
                  initialMessages={initialMessages}
                  onConversationId={(newId) => {
                    setConvId(newId)
                  }}
                  onStreamComplete={(resolvedConvId) => {
                    if (id === 'new' && resolvedConvId) {
                      // Use history.replaceState instead of router.replace so the URL
                      // updates without triggering a Next.js re-render that would
                      // flip key={id} and remount ChatPanel, losing streamed messages.
                      window.history.replaceState(
                        {},
                        '',
                        `/chat/${resolvedConvId}${docIdParam ? `?doc=${docIdParam}` : ''}`,
                      )
                    }
                  }}
                  onJumpToPage={setJumpPage}
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* PDF viewer */}
        <ResizablePanel defaultSize={50} minSize={20}>
          {pdfUrl ? (
            <PDFViewer url={pdfUrl} targetPage={jumpPage} />
          ) : convLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a document to preview it here
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </div>
  )
}
