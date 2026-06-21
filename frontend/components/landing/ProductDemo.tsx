'use client'

import { useEffect, useState } from 'react'
import { FileText, MessageSquare } from 'lucide-react'
import { FadeUp } from './shared/FadeUp'

const ANSWER_BULLETS = [
  'Revenue increased 27% year-over-year',
  'Customer retention improved by 14%',
  'Expansion into 3 new markets',
]
const SOURCES = ['Page 12', 'Page 18', 'Page 34']
const QUESTION = 'What are the key findings from this report?'
const REVEAL_SPEED = 40
const LOOP_PAUSE = 2500

export function ProductDemo() {
  const [visibleBullets, setVisibleBullets] = useState(0)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function runCycle() {
      setVisibleBullets(0)
      setShowSources(false)

      ANSWER_BULLETS.forEach((_, i) => {
        timeout = setTimeout(
          () => setVisibleBullets(i + 1),
          800 + i * 600
        )
      })

      timeout = setTimeout(
        () => setShowSources(true),
        800 + ANSWER_BULLETS.length * 600 + 300
      )

      timeout = setTimeout(
        () => runCycle(),
        800 + ANSWER_BULLETS.length * 600 + 300 + LOOP_PAUSE
      )
    }

    runCycle()
    return () => clearTimeout(timeout)
  }, [])

  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary text-center mb-4">
            See it in action
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground tracking-tight mb-12">
            Chat with your documents instantly
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-muted/60 px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-2 ml-2 text-sm text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  Q4 2024 Report.pdf
                </div>
              </div>
              <div className="p-6 flex flex-col gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-3 rounded-full bg-muted"
                    style={{ width: `${65 + ((i * 37) % 35)}%` }}
                  />
                ))}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Page 1 of 48</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="bg-muted/60 px-4 py-3 border-b border-border flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Chat</span>
              </div>

              <div className="flex-1 p-5 flex flex-col gap-4">
                <div className="self-end max-w-xs bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                  {QUESTION}
                </div>

                <div className="self-start max-w-sm">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-foreground space-y-2">
                    {visibleBullets === 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                    {ANSWER_BULLETS.slice(0, visibleBullets).map((bullet, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  {showSources && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SOURCES.map((src) => (
                        <span
                          key={src}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Ask a question about your document…
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
