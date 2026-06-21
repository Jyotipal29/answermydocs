'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function SettingsPage() {
  const { user, isLoading, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading])

  const { data: usage } = useQuery({
    queryKey: ['usage'],
    queryFn: () => authApi.getUsage().then((r) => r.data),
    enabled: !!user,
  })

  if (isLoading || !user) return null

  const isFree = user.plan === 'free'
  const msgPct = usage && usage.messages_limit > 0
    ? Math.min(100, Math.round((usage.messages_this_month / usage.messages_limit) * 100))
    : 0
  const storagePct = usage && usage.storage_limit_bytes > 0
    ? Math.min(100, Math.round((usage.storage_bytes / usage.storage_limit_bytes) * 100))
    : 0

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
          <h1 className="text-xl font-semibold">Settings</h1>

          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Member since {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={isFree ? 'secondary' : 'default'} className="capitalize">
                  {user.plan}
                </Badge>
              </div>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-fit text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => { logout(); router.push('/login') }}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>

          {/* Usage */}
          {usage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage this month</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Messages</span>
                    <span className="font-medium tabular-nums">
                      {usage.messages_this_month} / {usage.messages_limit === -1 ? '∞' : usage.messages_limit}
                    </span>
                  </div>
                  {usage.messages_limit !== -1 && (
                    <Progress value={msgPct} className="h-1.5" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="font-medium tabular-nums">
                      {usage.documents_count} / {usage.documents_limit === -1 ? '∞' : usage.documents_limit}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-medium tabular-nums">
                      {formatBytes(usage.storage_bytes)} / {formatBytes(usage.storage_limit_bytes)}
                    </span>
                  </div>
                  <Progress value={storagePct} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan &amp; billing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isFree ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    You're on the <strong>Free</strong> plan. Upgrade to Pro for unlimited documents,
                    5 GB storage, and unlimited messages.
                  </p>
                  <Button size="sm" className="w-fit">
                    Upgrade to Pro — $19/mo
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You're on the <strong className="text-foreground capitalize">{user.plan}</strong> plan.
                  Manage your subscription in the billing portal.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
