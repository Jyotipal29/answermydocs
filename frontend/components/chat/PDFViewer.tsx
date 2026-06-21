'use client'

import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getToken } from '@/lib/auth'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface Props {
  url: string
  targetPage?: number
}

export function PDFViewer({ url, targetPage }: Props) {
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function fetchPdf() {
      setFetchError(false)
      const token = getToken()
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok || cancelled) return
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch {
        if (!cancelled) setFetchError(true)
      }
    }

    setBlobUrl(null)
    fetchPdf()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      setPage(targetPage)
    }
  }, [targetPage, numPages])

  function onDocumentLoad({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || !blobUrl}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-20 text-center">
            {blobUrl ? `${page} / ${numPages || '—'}` : '— / —'}
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page >= numPages || !blobUrl}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={!blobUrl}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
            disabled={!blobUrl}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF render */}
      <div className="flex-1 overflow-auto flex justify-center p-4 relative bg-muted/10">
        {!blobUrl && !fetchError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading PDF…</p>
          </div>
        )}
        {fetchError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-destructive">Failed to load PDF.</p>
          </div>
        )}
        {blobUrl && (
          <Document
            file={blobUrl}
            onLoadSuccess={onDocumentLoad}
            loading={
              <div className="flex flex-col items-center justify-center gap-3 mt-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Rendering…</p>
              </div>
            }
            error={<p className="text-sm text-destructive mt-8">Failed to render PDF.</p>}
          >
            <Page
              pageNumber={page}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-md"
            />
          </Document>
        )}
      </div>
    </div>
  )
}
