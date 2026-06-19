'use client'

import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
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

  useEffect(() => {
    let objectUrl: string | null = null

    async function fetchPdf() {
      const token = getToken()
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return
      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
      setBlobUrl(objectUrl)
    }

    setBlobUrl(null)
    fetchPdf()

    return () => {
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
    <div className="flex flex-col h-full bg-muted/20">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-20 text-center">
            {page} / {numPages || '—'}
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF render */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={blobUrl}
          onLoadSuccess={onDocumentLoad}
          loading={<div className="text-sm text-muted-foreground mt-8">Loading PDF…</div>}
          error={<div className="text-sm text-destructive mt-8">Failed to load PDF.</div>}
        >
          <Page
            pageNumber={page}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer
            className="shadow-md"
          />
        </Document>
      </div>
    </div>
  )
}
