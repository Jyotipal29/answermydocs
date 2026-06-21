import { Check, X } from 'lucide-react'
import { FadeUp } from './shared/FadeUp'
import { SectionHeader } from './shared/SectionHeader'
import { cn } from '@/lib/utils'

const FEATURES = [
  { name: 'Source Citations' },
  { name: 'Multi-Document Search' },
  { name: 'Agentic Retrieval' },
  { name: 'Private Workspaces' },
  { name: 'Streaming Responses' },
]

const COLUMNS = [
  {
    name: 'AnswerMyDocs',
    highlight: true,
    values: [true, true, true, true, true],
  },
  {
    name: 'ChatPDF',
    highlight: false,
    values: [true, false, false, true, false],
  },
  {
    name: 'AskYourPDF',
    highlight: false,
    values: [true, false, false, false, false],
  },
]

export function ComparisonTable() {
  return (
    <section id="comparison" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <FadeUp>
          <SectionHeader eyebrow="Why AnswerMyDocs" title="Compare and decide" />
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground w-1/2">
                    Feature
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.name}
                      className={cn(
                        'px-6 py-4 text-center text-sm font-semibold',
                        col.highlight
                          ? 'bg-primary/8 text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, fi) => (
                  <tr
                    key={fi}
                    className={cn(
                      'border-b border-border last:border-0',
                      fi % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                    )}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {feature.name}
                    </td>
                    {COLUMNS.map((col) => (
                      <td
                        key={col.name}
                        className={cn(
                          'px-6 py-4 text-center',
                          col.highlight && 'bg-primary/5'
                        )}
                      >
                        {col.values[fi] ? (
                          <Check className={cn('w-5 h-5 mx-auto', col.highlight ? 'text-primary' : 'text-muted-foreground')} />
                        ) : (
                          <X className="w-5 h-5 mx-auto text-destructive/60" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}
