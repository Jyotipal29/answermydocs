import { Search, BookOpen, Cpu, Zap } from 'lucide-react'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Search,
    title: 'Multi-Document Search',
    description:
      'Ask one question across your entire library. AnswerMyDocs searches all uploaded documents simultaneously and synthesizes the best answer.',
    mockup: (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Search className="w-4 h-4 shrink-0" />
          What does the contract say about liability?
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {['Contract_2024.pdf', 'Amendment_A.pdf', 'NDA_Final.pdf'].map((f) => (
            <span key={f} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
              {f}
            </span>
          ))}
        </div>
        <div className="space-y-1.5">
          {[80, 65, 90].map((w, i) => (
            <div key={i} className="h-2.5 bg-muted rounded-full" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: 'Source Citations',
    description:
      'Every answer includes the exact page number. Click any citation to jump directly to the supporting passage in the original document.',
    mockup: (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="space-y-2">
          {[85, 70, 55].map((w, i) => (
            <div key={i} className="h-2.5 bg-muted rounded-full" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {['Page 12', 'Page 18', 'Page 34'].map((p) => (
            <button
              key={p}
              className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-foreground">
          <span className="font-semibold text-primary">↗ Page 12 —</span> "The liability clause
          shall not exceed the total contract value…"
        </div>
      </div>
    ),
  },
  {
    icon: Cpu,
    title: 'Agentic Research',
    description:
      'The AI automatically reformulates its search when the first result is not sufficient. You get better answers without rephrasing your question.',
    mockup: (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
        {[
          { label: 'Initial search', done: true },
          { label: 'Refining query…', done: true },
          { label: 'Cross-referencing sources', done: false },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                step.done ? 'bg-primary' : 'border-2 border-primary/40'
              )}
            >
              {step.done && <span className="text-white text-[10px]">✓</span>}
            </div>
            <span className={cn('text-sm', step.done ? 'text-foreground' : 'text-muted-foreground')}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Zap,
    title: 'Streaming Responses',
    description:
      'Answers start appearing instantly. No waiting for the full response before you begin reading and reacting.',
    mockup: (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-2.5 bg-foreground/70 rounded-full w-full" />
          <div className="h-2.5 bg-foreground/70 rounded-full w-5/6" />
          <div className="h-2.5 bg-foreground/70 rounded-full w-4/5" />
          <div className="flex items-center gap-1 mt-1">
            <div className="h-2.5 bg-foreground/80 rounded-full w-1/3" />
            <div className="w-0.5 h-4 bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    ),
  },
]

export function FeatureShowcase() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <SectionHeader
            eyebrow="Built for depth"
            title="Features that match how you actually work"
          />
        </FadeUp>

        <div className="flex flex-col gap-24">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            const isEven = i % 2 === 0

            return (
              <FadeUp key={i} delay={0.05}>
                <div
                  className={cn(
                    'grid lg:grid-cols-2 gap-12 items-center',
                    !isEven && 'lg:[&>*:first-child]:order-2'
                  )}
                >
                  <div className="flex flex-col gap-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div>{feature.mockup}</div>
                </div>
              </FadeUp>
            )
          })}
        </div>
      </div>
    </section>
  )
}
