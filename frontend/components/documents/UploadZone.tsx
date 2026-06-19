'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)
  const [error, setError] = useState('')

  function validate(file: File): string {
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') return 'Only PDF files are accepted'
    return ''
  }

  function pick(file: File) {
    const err = validate(file)
    if (err) { setError(err); return }
    setError('')
    setSelected(file)
    onFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) pick(file)
  }, [])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) pick(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload className="w-8 h-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium text-sm">Drop your PDF here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
        </div>
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={onChange}
          disabled={disabled}
        />
      </label>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {selected && !error && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(selected.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => { setSelected(null); setError('') }}
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
