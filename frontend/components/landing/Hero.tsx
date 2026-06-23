'use client'

import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/useAuthStore'

export function Hero() {
  const { user } = useAuthStore()
  return (
    <section
      id="hero"
      className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-6">
        <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full">
          ✨ Free plan available · No credit card required
        </Badge>

        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-foreground tracking-tight leading-tight">
          Stop Reading PDFs.
          <br />
          Get Answers in Seconds.
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Upload research papers, reports, contracts, books, and manuals.
          Ask questions in plain English and get answers backed by exact page citations.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Button size="lg" asChild className="h-12 px-6 text-base gap-2">
            <Link href={user ? '/upload' : '/signup'}>
              Upload PDF Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="h-12 px-6 text-base gap-2">
            <a href="#demo">
              <Play className="w-4 h-4" />
              Watch Demo
            </a>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          Trusted by students, researchers, consultants, and teams.
        </p>
      </div>
    </section>
  )
}
