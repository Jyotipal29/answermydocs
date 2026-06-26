'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { GoogleLogin } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi, extractApiError } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { useAuthStore } from '@/store/useAuthStore'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128, 'Too long'),
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.signup(data.email, data.password)
      setToken(res.data.access_token)
      const meRes = await authApi.getMe()
      login(res.data.access_token, meRes.data)
      router.push('/dashboard')
    } catch (e: unknown) {
      toast.error(extractApiError(e))
    }
  }

  async function onGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return
    setIsGoogleLoading(true)
    try {
      const res = await authApi.googleAuth(credentialResponse.credential)
      setToken(res.data.access_token)
      const meRes = await authApi.getMe()
      login(res.data.access_token, meRes.data)
      router.push('/dashboard')
    } catch (e: unknown) {
      toast.error(extractApiError(e))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4 bg-background text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start chatting with your documents</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="8+ characters" {...register('password')} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full mt-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 border-t border-border" />
            or
            <div className="flex-1 border-t border-border" />
          </div>

          <div className="flex justify-center min-h-[40px] items-center">
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => toast.error('Google sign-in failed')}
              />
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
