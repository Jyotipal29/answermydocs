import { Microscope, Scale, BarChart2, BookOpen, FileCheck, Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'

const CASES = [
  {
    icon: Microscope,
    title: 'Academic Research',
    description: 'Synthesize literature across 50 papers in minutes. Find contradictions, gaps, and evidence without manual reading.',
  },
  {
    icon: Scale,
    title: 'Legal Review',
    description: 'Find contract clauses and case precedents instantly. Never miss a liability term buried on page 47.',
  },
  {
    icon: BarChart2,
    title: 'Business Reports',
    description: 'Extract KPIs, key metrics, and insights from quarterly reports, earnings calls, and analyst coverage.',
  },
  {
    icon: BookOpen,
    title: 'Books & Learning',
    description: 'Ask questions while you read. Get explanations, summaries, and answers from any chapter instantly.',
  },
  {
    icon: FileCheck,
    title: 'Contracts',
    description: 'Never miss a clause or deadline again. Surface key dates, obligations, and conditions on demand.',
  },
  {
    icon: Database,
    title: 'Internal Knowledge Bases',
    description: 'Search your company\'s policies, wikis, and documentation like Google — across all files at once.',
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <SectionHeader
            eyebrow="Who uses AnswerMyDocs"
            title="From PhDs to product teams"
          />
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CASES.map((c, i) => {
            const Icon = c.icon
            return (
              <FadeUp key={i} delay={i * 0.06}>
                <Card className="h-full border hover:border-primary hover:shadow-md transition-all duration-200 group">
                  <CardContent className="pt-6">
                    <Icon className="w-7 h-7 text-primary mb-4 group-hover:scale-110 transition-transform duration-200" />
                    <h3 className="text-base font-semibold text-foreground mb-2">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                  </CardContent>
                </Card>
              </FadeUp>
            )
          })}
        </div>
      </div>
    </section>
  )
}
