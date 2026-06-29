'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, Upload, MessageSquare, Settings, LogOut, LayoutDashboard, Trash2, Pencil, Loader2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/useAuthStore'
import { authApi, conversationsApi, Conversation, extractApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Documents', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
]

function ConversationItem({
  conversation: c,
  isActive,
  onDeleted,
  onRenamed,
}: {
  conversation: Conversation
  isActive: boolean
  onDeleted: () => void
  onRenamed: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(c.title || '')
  const inputRef = useRef<HTMLInputElement>(null)

  const { mutate: deleteConv, isPending: deleting } = useMutation({
    mutationFn: () => conversationsApi.delete(c.id),
    onSuccess: () => { setConfirmOpen(false); onDeleted() },
    onError: (e) => { setConfirmOpen(false); toast.error(extractApiError(e)) },
  })

  const { mutate: renameConv, isPending: renaming } = useMutation({
    mutationFn: () => conversationsApi.rename(c.id, title),
    onSuccess: () => { setEditing(false); onRenamed() },
    onError: (e) => { toast.error(extractApiError(e)) },
  })

  function startEditing() {
    setTitle(c.title || '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitRename() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === c.title) { setEditing(false); return }
    renameConv()
  }

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center rounded-md px-2 h-8 text-xs font-normal hover:bg-accent',
          isActive && 'bg-accent'
        )}
      >
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs"
              autoFocus
            />
            <button onClick={commitRename} disabled={renaming} className="shrink-0 text-primary hover:opacity-80">
              {renaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={() => setEditing(false)} className="shrink-0 text-muted-foreground hover:opacity-80">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <Link href={`/chat/${c.id}`} className="flex items-center gap-2 flex-1 min-w-0 h-full">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.title || 'Untitled'}</span>
            </Link>
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
              <button
                onClick={startEditing}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                title="Rename"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[400px] bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">&ldquo;{c.title || 'Untitled'}&rdquo;</span> and all its
              messages will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="default" onClick={() => deleteConv()} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export function Sidebar({ isOpen = true }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => authApi.getUsage().then((r) => r.data),
    enabled: !!user,
  })

  const qc = useQueryClient()

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.list().then((r) => r.data),
    enabled: !!user,
  })

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const isFree = user?.plan === 'free'
  const usedMessages = usage?.messages_this_month ?? 0
  const maxMessages = usage?.messages_limit ?? 100
  const usagePercent = Math.min(100, Math.round((usedMessages / maxMessages) * 100))

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-sidebar-border h-screen flex flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 overflow-hidden',
        isOpen ? 'w-60' : 'w-0 border-r-0'
      )}
    >
      {/* Inner wrapper keeps content from squishing during animation */}
      <div className="w-60 flex flex-col h-full">
        <div className="px-4 py-4 border-b border-sidebar-border shrink-0">
          <Link href="/" className="font-semibold text-base tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-sidebar-primary shrink-0" />
            AnswerMyDocs
          </Link>
        </div>

        <nav className="flex flex-col gap-1 px-2 pt-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={pathname === href ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2 h-9 text-sm"
              asChild
            >
              <Link href={href}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>

        {conversations && conversations.length > 0 && (
          <>
            <Separator className="mx-2 my-2 w-auto" />
            <div className="px-3 mb-1">
              <p className="text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wide">
                Recent chats
              </p>
            </div>
            <div className="flex flex-col gap-0.5 px-2 overflow-y-auto flex-1">
              {conversations.slice(0, 20).map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  isActive={pathname === `/chat/${c.id}`}
                  onDeleted={() => {
                    qc.invalidateQueries({ queryKey: ['conversations'] })
                    if (pathname === `/chat/${c.id}`) router.replace('/dashboard')
                  }}
                  onRenamed={() => qc.invalidateQueries({ queryKey: ['conversations'] })}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-auto border-t border-sidebar-border px-3 py-3 flex flex-col gap-3">
          {isFree && usage && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                <span>{usedMessages}/{maxMessages} messages</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Free</Badge>
              </div>
              <div className="h-1.5 rounded-full bg-sidebar-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <Link href="/settings" className="text-[11px] text-primary hover:underline">
                Upgrade to Pro →
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.email}</p>
              <p className="text-[11px] text-sidebar-foreground/50 capitalize">{user?.plan} plan</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings"><Settings className="w-3.5 h-3.5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout}>
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
