'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Trash2, MessageSquare, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Document, DocumentStatus, documentsApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

const statusConfig: Record<DocumentStatus, { label: string; icon: React.ReactNode; variant: 'secondary' | 'destructive' | 'default' | 'outline' }> = {
  uploading:  { label: 'Uploading',  icon: <Loader2 className="w-3 h-3 animate-spin" />, variant: 'secondary' },
  processing: { label: 'Processing', icon: <Loader2 className="w-3 h-3 animate-spin" />, variant: 'secondary' },
  ready:      { label: 'Ready',      icon: <CheckCircle2 className="w-3 h-3" />,          variant: 'default' },
  failed:     { label: 'Failed',     icon: <AlertCircle className="w-3 h-3" />,            variant: 'destructive' },
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentCard({ doc }: { doc: Document }) {
  const [deleting, setDeleting] = useState(false)
  const qc = useQueryClient()
  const status = statusConfig[doc.status]

  async function handleDelete() {
    if (!confirm(`Delete "${doc.filename}"?`)) return
    setDeleting(true)
    try {
      await documentsApi.delete(doc.id)
      qc.invalidateQueries({ queryKey: ['documents'] })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="group">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 text-muted-foreground">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={status.variant} className="gap-1 text-[11px] h-5 px-1.5">
              {status.icon}
              {status.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{formatBytes(doc.file_size_bytes)}</span>
            {doc.page_count && (
              <span className="text-[11px] text-muted-foreground">{doc.page_count} pages</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {doc.status === 'ready' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <Link href={`/chat/new?doc=${doc.id}`}>
                <MessageSquare className="w-3.5 h-3.5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
