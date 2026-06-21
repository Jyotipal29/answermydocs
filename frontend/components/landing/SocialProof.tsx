const STATS = [
  { value: '50,000+', label: 'Questions Answered' },
  { value: '10,000+', label: 'Documents Processed' },
  { value: '99%', label: 'Citation Accuracy' },
  { value: '4.9/5', label: 'User Satisfaction' },
]

export function SocialProof() {
  return (
    <section id="social-proof" className="py-16 px-6 border-y border-border/30">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center gap-1"
          >
            <span className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {stat.value}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
