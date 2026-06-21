'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-md bg-background/90 border-b border-border shadow-xs'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <FileText className="w-5 h-5 text-primary" />
          AnswerMyDocs
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          {!isLoading && (
            user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard →</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Start Free</Link>
                </Button>
              </>
            )
          )}
        </div>

        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            {!isLoading && (
              user ? (
                <Button asChild>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard →</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Start Free</Link>
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </header>
  )
}
