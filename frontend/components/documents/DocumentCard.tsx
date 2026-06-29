'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, Trash2, MessageSquare, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Document, DocumentStatus, documentsApi, extractApiError } from '@/lib/api'

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
  const qc = useQueryClient()
  const status = statusConfig[doc.status]
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { mutate: deleteDoc, isPending: deleting } = useMutation({
    mutationFn: () => documentsApi.delete(doc.id),
    onSuccess: () => {
      setConfirmOpen(false)
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e) => {
      setConfirmOpen(false)
      toast.error(extractApiError(e))
    },
  })

  return (
    <>
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
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[600px] bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">&ldquo;{doc.filename}&rdquo;</span> will be permanently
              deleted along with all its associated chats and embeddings. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="default" onClick={() => deleteDoc()} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
