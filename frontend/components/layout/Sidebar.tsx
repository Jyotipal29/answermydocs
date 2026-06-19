'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, Upload, MessageSquare, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/useAuthStore'
import { useQuery } from '@tanstack/react-query'
import { authApi, conversationsApi } from '@/lib/api'

const navItems = [
  { href: '/dashboard', label: 'Documents', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => authApi.getUsage().then((r) => r.data),
    enabled: !!user,
  })

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
    <aside className="w-60 shrink-0 border-r border-border h-screen flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="font-semibold text-base tracking-tight">
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
            {conversations.slice(0, 10).map((c) => (
              <Button
                key={c.id}
                variant={pathname === `/chat/${c.id}` ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2 h-8 text-xs font-normal"
                asChild
              >
                <Link href={`/chat/${c.id}`}>
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.title || 'Untitled'}</span>
                </Link>
              </Button>
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
    </aside>
  )
}
