'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FadeUp } from './shared/FadeUp'
import { useAuthStore } from '@/store/useAuthStore'

export function FinalCTA() {
  const { user } = useAuthStore()
  return (
    <section id="cta" className="py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <FadeUp>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-5">
            Your Next Answer Is Already
            <br />
            Inside Your PDF
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Upload a document and start chatting in seconds. No credit card required.
          </p>
          <Button size="lg" asChild className="h-12 px-8 text-base gap-2">
            <Link href={user ? '/upload' : '/signup'}>
              Upload PDF Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="mt-5 text-sm text-muted-foreground">
            Join 10,000+ students, researchers, and teams
          </p>
        </FadeUp>
      </div>
    </section>
  )
}
