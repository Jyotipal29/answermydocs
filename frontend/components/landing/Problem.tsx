import { GraduationCap, Microscope, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'

const CARDS = [
  {
    icon: GraduationCap,
    title: 'Students',
    description: 'Stop digging through 100-page research papers. Find the answer in seconds.',
  },
  {
    icon: Microscope,
    title: 'Researchers',
    description: 'Find evidence and citations instantly across your entire literature library.',
  },
  {
    icon: Users,
    title: 'Teams',
    description: 'Search across all company documents with one question.',
  },
]

export function Problem() {
  return (
    <section id="problem" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionHeader title="Reading Documents Shouldn't Take Hours" />
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6">
          {CARDS.map((card, i) => {
            const Icon = card.icon
            return (
              <FadeUp key={i} delay={i * 0.08}>
                <Card className="h-full border hover:shadow-md transition-shadow duration-200">
                  <CardContent className="pt-6">
                    <Icon className="w-8 h-8 text-primary mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{card.description}</p>
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
