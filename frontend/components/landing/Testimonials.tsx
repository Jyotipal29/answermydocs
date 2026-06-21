import { Card, CardContent } from '@/components/ui/card'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'

const TESTIMONIALS = [
  {
    initials: 'LH',
    name: 'Layla Hassan',
    role: 'PhD Candidate, MIT',
    color: 'bg-violet-100 text-violet-700',
    stars: 5,
    quote:
      'I used to spend 3 hours on literature review before each chapter. Now I upload all 40 papers and ask AnswerMyDocs to find contradicting findings. Takes 8 minutes.',
  },
  {
    initials: 'MC',
    name: 'Marcus Chen',
    role: 'Product Manager, Stripe',
    color: 'bg-indigo-100 text-indigo-700',
    stars: 5,
    quote:
      'Our team uploads every competitor announcement, analyst report, and board deck. Asking questions across 200 documents simultaneously has changed how we do strategy.',
  },
  {
    initials: 'PN',
    name: 'Priya Nakamura',
    role: 'Strategy Consultant',
    color: 'bg-blue-100 text-blue-700',
    stars: 5,
    quote:
      'Client due diligence used to mean 60-hour weeks of manual document review. I can now extract the same insights from 300-page data rooms in an afternoon.',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <SectionHeader
            eyebrow="What people say"
            title="Real workflows, real results"
          />
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp key={i} delay={i * 0.08}>
              <Card className="h-full border shadow-sm">
                <CardContent className="pt-6 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <span key={si} className="text-primary text-lg">★</span>
                    ))}
                  </div>

                  <p className="text-foreground leading-relaxed text-sm flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${t.color}`}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}
