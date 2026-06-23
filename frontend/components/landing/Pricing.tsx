'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'
import { cn } from '@/lib/utils'

const FREE_FEATURES = [
  '3 documents',
  '50 questions / month',
  'Source citations',
  '1 workspace',
]

const PRO_FEATURES = [
  'Unlimited documents',
  'Unlimited questions',
  'Source citations',
  '10 workspaces',
  'Agentic retrieval',
  'Priority support',
]

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false)
  const { user } = useAuthStore()

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeUp>
          <SectionHeader eyebrow="Pricing" title="Start free. Scale when ready." />
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={cn('text-sm font-medium', !isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
              Monthly
            </span>
            <button
              role="switch"
              aria-checked={isAnnual}
              onClick={() => setIsAnnual((v) => !v)}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0',
                isAnnual ? 'bg-primary' : 'bg-border'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200',
                  isAnnual ? 'left-7' : 'left-1'
                )}
              />
            </button>
            <span className={cn('text-sm font-medium flex items-center gap-2', isAnnual ? 'text-foreground' : 'text-muted-foreground')}>
              Annual
              {isAnnual && (
                <Badge className="text-xs bg-primary/20 text-primary border-0 px-2">Save 20%</Badge>
              )}
            </span>
          </div>
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Card className="border">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-foreground">Free</h3>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground mb-1">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <ul className="space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" asChild className="w-full mt-2">
                  <Link href={user ? '/upload' : '/signup'}>Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro card — badge lives on the wrapper div, outside Card's overflow-hidden */}
            <div className="relative pt-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
              </div>
              <Card
                className="border-2 border-primary"
                style={{ boxShadow: '0 0 60px rgba(99,102,241,0.20)' }}
              >
                <CardHeader className="pb-4">
                  <h3 className="text-lg font-semibold text-foreground">Pro</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-4xl font-bold text-foreground">
                      ${isAnnual ? '15' : '19'}
                    </span>
                    <span className="text-muted-foreground mb-1">/ month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground">Billed $180/year</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <ul className="space-y-3">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full mt-2">
                    <Link href={user ? '/upload' : '/signup?plan=pro'}>Start Pro Free Trial</Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    14-day free trial · No credit card required
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
