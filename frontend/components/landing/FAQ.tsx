'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'

const FAQS = [
  {
    q: 'Is my data private?',
    a: 'Yes. Your documents are stored privately in your workspace. We never use your documents or conversations to train AI models. Each workspace is fully isolated.',
  },
  {
    q: 'How many documents can I upload?',
    a: 'The Free plan supports up to 3 documents at a time. Pro is unlimited — upload as many PDFs as your research requires.',
  },
  {
    q: 'What file types are supported?',
    a: 'PDFs only, up to 100MB per file. Support for Word documents and plain text is on the roadmap.',
  },
  {
    q: 'How accurate are the source citations?',
    a: 'Citations link directly to specific pages in your documents. The AI quotes verbatim from the source text, so you can verify every answer at its origin.',
  },
  {
    q: 'Can I cancel my Pro subscription?',
    a: 'Yes, anytime — no questions asked. You retain full Pro access until the end of your current billing period.',
  },
  {
    q: 'Is there a free trial for Pro?',
    a: 'Yes. Pro includes a 14-day free trial with full access and no credit card required.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <FadeUp>
          <SectionHeader eyebrow="FAQ" title="Everything you need to know" />
        </FadeUp>

        <FadeUp delay={0.08}>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border rounded-xl px-5 bg-card data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeUp>
      </div>
    </section>
  )
}
