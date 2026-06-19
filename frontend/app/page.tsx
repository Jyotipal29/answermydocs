import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Zap, Shield, MessageSquare } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg tracking-tight">AnswerMyDocs</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center gap-6 px-6 py-24 flex-1">
        <Badge variant="secondary" className="text-xs">Free tier · No credit card</Badge>
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          Chat with your PDFs,<br />get answers with sources
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Upload documents, ask questions in plain English, and get answers
          that cite the exact page — clickable to jump right there.
        </p>
        <div className="flex gap-3 mt-2">
          <Button size="lg" asChild>
            <Link href="/signup">Upload your first PDF</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: <FileText className="w-5 h-5" />,
              title: 'Multi-document workspaces',
              desc: 'Ask questions across multiple PDFs at once and find connections between documents.',
            },
            {
              icon: <Zap className="w-5 h-5" />,
              title: 'Agentic RAG',
              desc: 'The AI re-tries with rewritten queries when results are poor, so you always get the best answer.',
            },
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: 'Streaming answers',
              desc: 'Responses stream token-by-token. No waiting for a full response to appear.',
            },
            {
              icon: <Shield className="w-5 h-5" />,
              title: 'Private by default',
              desc: 'Your documents are isolated to your account. Row-level security enforced at the database.',
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="mt-1 text-primary">{f.icon}</div>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-muted-foreground text-sm mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border px-6 py-20 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold">Simple pricing</h2>
          <p className="text-muted-foreground mt-2 mb-8">Start free. Upgrade when you need more.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {[
              {
                name: 'Free',
                price: '$0',
                features: ['5 documents', '50 MB storage', '100 messages/month', '10 MB per PDF'],
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$19/mo',
                features: ['Unlimited documents', '5 GB storage', 'Unlimited messages', '100 MB per PDF'],
                highlight: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-6 ${plan.highlight ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <p className="font-semibold text-lg">{plan.name}</p>
                <p className="text-3xl font-bold mt-1">{plan.price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-muted-foreground flex gap-2">
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AnswerMyDocs
      </footer>
    </main>
  )
}
