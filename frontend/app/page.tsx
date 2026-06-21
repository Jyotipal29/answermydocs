import type { Metadata } from 'next'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { ProductDemo } from '@/components/landing/ProductDemo'
import { SocialProof } from '@/components/landing/SocialProof'
import { Problem } from '@/components/landing/Problem'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeatureShowcase } from '@/components/landing/FeatureShowcase'
import { UseCases } from '@/components/landing/UseCases'
import { ComparisonTable } from '@/components/landing/ComparisonTable'
import { Testimonials } from '@/components/landing/Testimonials'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'AnswerMyDocs — Get Answers from Your PDFs in Seconds',
  description:
    'Upload PDFs and ask questions in plain English. Get source-cited answers instantly. Used by 10,000+ researchers, students, and teams.',
  openGraph: {
    type: 'website',
    title: 'AnswerMyDocs — Get Answers from Your PDFs in Seconds',
    description:
      'Upload PDFs and ask questions in plain English. Get source-cited answers instantly.',
  },
}

export default function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main>
        <Hero />
        {/* <ProductDemo /> */}
        {/* <SocialProof /> */}
        <Problem />
        <HowItWorks />
        <FeatureShowcase />
        <UseCases />
        {/* <ComparisonTable /> */}
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
