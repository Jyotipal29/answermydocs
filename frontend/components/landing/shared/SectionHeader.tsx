import { cn } from '@/lib/utils'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  centered?: boolean
  className?: string
}

export function SectionHeader({ eyebrow, title, subtitle, centered = true, className }: Props) {
  return (
    <div className={cn('mb-16', centered && 'text-center', className)}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
          {eyebrow}
        </p>
      )}
      <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
