'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/layout/Sidebar'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { documentsApi, extractApiError } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading])

  const { data: documents, isLoading: docsLoading, isError, error } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then((r) => r.data),
    enabled: !!user,
    refetchInterval: (query) => {
      const docs = query.state.data
      const hasProcessing = docs?.some((d) => d.status === 'uploading' || d.status === 'processing')
      return hasProcessing ? 3000 : false
    },
  })

  useEffect(() => {
    if (isError) toast.error(extractApiError(error))
  }, [isError, error])

  if (isLoading) return null

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Documents</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Your personal knowledge base</p>
            </div>
            <Button asChild>
              <Link href="/upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Link>
            </Button>
          </div>

          {docsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4 border-2 border-dashed border-border rounded-lg">
              <FileText className="w-10 h-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a PDF to start chatting with it
                </p>
              </div>
              <Button asChild>
                <Link href="/upload">Upload your first PDF</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
