'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sidebar } from '@/components/layout/Sidebar'
import { UploadZone } from '@/components/documents/UploadZone'
import { documentsApi, subscribeToDocumentStatus, extractApiError } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { useQueryClient } from '@tanstack/react-query'

type Stage = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

const stageLabel: Record<Stage, string> = {
  idle: '',
  uploading: 'Uploading…',
  processing: 'Processing…',
  ready: 'Ready!',
  failed: 'Failed',
}

const stageProgress: Record<Stage, number> = {
  idle: 0,
  uploading: 15,
  processing: 60,
  ready: 100,
  failed: 100,
}

export default function UploadPage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [docId, setDocId] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading])

  useEffect(() => () => { cleanupRef.current?.() }, [])

  async function handleUpload() {
    if (!file) return
    setError('')
    setStage('uploading')

    try {
      const res = await documentsApi.upload(file)
      const id = res.data.id
      setDocId(id)
      setStage('processing')
      qc.invalidateQueries({ queryKey: ['documents'] })

      cleanupRef.current = subscribeToDocumentStatus(
        id,
        (event) => {
          setStatusMsg(event.message || event.status)
          if (event.status === 'ready') setStage('ready')
          else if (event.status === 'failed') { setStage('failed'); setError('Indexing failed') }
          else setStage('processing')
        },
        () => {
          qc.invalidateQueries({ queryKey: ['documents'] })
        },
      )
    } catch (e: unknown) {
      setError(extractApiError(e))
      setStage('failed')
    }
  }

  if (isLoading) return null

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8">
          <h1 className="text-xl font-semibold mb-1">Upload PDF</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We'll extract, chunk, and embed your document for instant Q&A.
          </p>

          <UploadZone onFile={setFile} disabled={stage !== 'idle'} />

          {stage !== 'idle' && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{statusMsg || stageLabel[stage]}</span>
                <span className="font-medium">{stageProgress[stage]}%</span>
              </div>
              <Progress value={stageProgress[stage]} className="h-2" />

              {stage === 'ready' && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Document ready — you can now chat with it
                </div>
              )}

              {stage === 'failed' && error && (
                <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {stage === 'idle' && (
              <Button onClick={handleUpload} disabled={!file}>
                Upload &amp; index
              </Button>
            )}
            {stage === 'ready' && docId && (
              <>
                <Button onClick={() => router.push(`/chat/new?doc=${docId}`)}>
                  Chat with this document
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setStage('idle'); setDocId(null); setStatusMsg('') }}>
                  Upload another
                </Button>
              </>
            )}
            {stage === 'failed' && (
              <Button variant="outline" onClick={() => { setStage('idle'); setError('') }}>
                Try again
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
