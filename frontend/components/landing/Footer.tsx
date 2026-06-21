import Link from 'next/link'
import { FileText } from 'lucide-react'

const LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'FAQ', href: '#faq' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/30">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              AnswerMyDocs
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-48">
              AI-powered answers from your documents.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                GitHub
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                X
              </a>
            </div>
          </div>

          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group} className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-foreground">{group}</h4>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 AnswerMyDocs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
