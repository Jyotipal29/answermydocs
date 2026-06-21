import { Upload, MessageSquare, CheckCircle } from 'lucide-react'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'

const STEPS = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload PDFs',
    description: 'Drag and drop any PDF. We handle the rest — parsing, indexing, and preparing it for intelligent search.',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'Ask Questions',
    description: 'Use plain English. No search syntax, no Boolean operators. Just ask what you want to know.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Get Verified Answers',
    description: 'Every answer includes the exact page number. Click to jump directly to the source passage.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <SectionHeader
            eyebrow="Simple by Design"
            title="Three steps to stop reading, start knowing"
          />
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <FadeUp key={i} delay={i * 0.12}>
                <div className="flex flex-col items-center text-center gap-4">
                  <span className="text-6xl font-bold text-primary/40 leading-none select-none">
                    {step.number}
                  </span>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center -mt-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </FadeUp>
            )
          })}
        </div>
      </div>
    </section>
  )
}
