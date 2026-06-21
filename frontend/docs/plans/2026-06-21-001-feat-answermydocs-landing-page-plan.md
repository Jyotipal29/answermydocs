---
id: 2026-06-21-001
title: Premium SaaS Landing Page for AnswerMyDocs
type: feat
status: ready
origin: user-prompt (ce-plan invocation 2026-06-21)
---

# Premium SaaS Landing Page for AnswerMyDocs

## Problem Frame

The current `app/page.tsx` is a ~90-line MVP placeholder with a generic nav, basic hero, 4 feature cards, 2-tier pricing, and a footer. It does not communicate the product's value at the level required for a premium AI SaaS product. The task is to replace it entirely with a 14-section premium landing page (14 visual sections, U4–U17) supported by global CSS/font updates (U1–U2), shared motion primitives (U3), and root page assembly (U18) — 18 implementation units in total.

## Scope Boundary

- **In:** landing page (`app/page.tsx` and `components/landing/`); global CSS token update (app-wide — will also update dashboard and chat UI, which use the same tokens); global font swap to Inter (app-wide); responsive web layout down to 375px viewport
- **Out:** auth flows, dashboard feature changes, pricing backend, Stripe integration (separate task), native iOS/Android mobile app

---

## Prerequisites (user runs these)

```bash
# from frontend/
npm install framer-motion
npx shadcn@latest add accordion
```

Framer Motion is not currently installed (`package.json` confirmed). The `accordion` shadcn component is not in `components/ui/` (only 11 components present). Both must be installed before any landing page code runs.

After installing accordion, verify that `components/ui/accordion.tsx` was generated with the `radix-nova` style conventions (matching the class patterns in `components/ui/card.tsx`, e.g. `ring-1 ring-foreground/10`). If the CLI served a mismatched style template, manually align the class names.

---

## Design System Decisions

### Color Tokens (replaces current oklch theme in `app/globals.css`)

| Token | Value | Usage |
|---|---|---|
| `--background` | `#FFFFFF` | Page background |
| `--foreground` | `#0F172A` | Primary text |
| `--primary` | `#4F46E5` | CTAs, primary buttons |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--accent` | `#6366F1` | Hover states, accents |
| `--accent-foreground` | `#FFFFFF` | Text on accent |
| `--secondary` | `#64748B` | Secondary text |
| `--secondary-foreground` | `#FFFFFF` | Text on secondary |
| `--muted` | `#F8FAFC` | Muted backgrounds |
| `--muted-foreground` | `#64748B` | Muted text |
| `--border` | `#E2E8F0` | All borders |
| `--input` | `#E2E8F0` | Input borders |
| `--ring` | `#4F46E5` | Focus rings |
| `--card` | `#FFFFFF` | Card backgrounds |
| `--card-foreground` | `#0F172A` | Card text |
| `--destructive` | `#EF4444` | Error states |
| `--destructive-foreground` | `#FFFFFF` | Text on destructive |

**Decision:** Update `app/globals.css` app-wide (not landing-scoped). This also resolves the broken theme from the debug session — the compiled CSS was serving old shadcn neutral hex defaults instead of the oklch values.

### Typography

**Font:** Inter (replaces Geist for the whole app)

| Context | Size | Weight |
|---|---|---|
| Hero headline (desktop) | `72px` / `text-7xl` | `font-bold` |
| Hero headline (tablet) | `48px` / `md:text-5xl` | `font-bold` |
| Hero headline (mobile) | `36px` / `text-4xl` | `font-bold` |
| Section headings | `48px` / `text-5xl` | `font-bold` |
| Body | `18px` / `text-lg` | `font-normal` |
| Small / caption | `14px` / `text-sm` | — |

**Decision:** Load Inter globally in `app/layout.tsx` via `next/font/google`, replacing `Geist` and `Geist_Mono`.

### Animation Principles (Framer Motion)

- Fade-up reveals on scroll enter (`initial: { opacity: 0, y: 24 }` → `animate: { opacity: 1, y: 0 }`)
- Stagger children with `0.08s` delay between items
- Hover: subtle `scale(1.02)` with `200ms` ease
- No flashy transitions, no parallax, no scroll-jacking

---

## Component Architecture

```
frontend/
  app/
    page.tsx                         ← REPLACE (root landing page)
    layout.tsx                       ← MODIFY (Inter font, metadata)
    globals.css                      ← REPLACE (new color tokens)
  components/
    landing/
      Navbar.tsx
      Hero.tsx
      ProductDemo.tsx
      SocialProof.tsx
      Problem.tsx
      HowItWorks.tsx
      FeatureShowcase.tsx
      UseCases.tsx
      ComparisonTable.tsx
      Testimonials.tsx
      Pricing.tsx
      FAQ.tsx
      FinalCTA.tsx
      Footer.tsx
      shared/
        FadeUp.tsx                   ← reusable motion wrapper
        SectionHeader.tsx            ← reusable section title + subtitle
```

All components are Server Components unless they require `useState`/`useEffect`/Framer Motion client hooks — those get `'use client'`.

---

## Implementation Units

### U1 — Global CSS Token Replacement

**Goal:** Replace current `app/globals.css` oklch theme with the new hex-based design system.

**Files:**
- Modify: `app/globals.css`

**Approach:**
- Keep the `@import "tailwindcss"` and `@theme inline` block structure exactly as-is (Tailwind v4 requires this)
- Remove the duplicate `@import "tailwindcss"` (currently appears twice at the top — bug)
- Replace all `:root` CSS variable values with the light mode tokens from the Design System section above
- Replace all `.dark` CSS variable values with these dark mode tokens:

| Dark token | Value |
|---|---|
| `--background` | `#0F172A` |
| `--foreground` | `#F8FAFC` |
| `--card` | `#1E293B` |
| `--card-foreground` | `#F8FAFC` |
| `--popover` | `#1E293B` |
| `--popover-foreground` | `#F8FAFC` |
| `--primary` | `#6366F1` |
| `--primary-foreground` | `#FFFFFF` |
| `--secondary` | `#334155` |
| `--secondary-foreground` | `#F8FAFC` |
| `--muted` | `#1E293B` |
| `--muted-foreground` | `#94A3B8` |
| `--accent` | `#4F46E5` |
| `--accent-foreground` | `#FFFFFF` |
| `--destructive` | `#F87171` |
| `--destructive-foreground` | `#0F172A` |
| `--border` | `#334155` |
| `--input` | `#334155` |
| `--ring` | `#6366F1` |

- Keep all `--color-*` mappings in `@theme inline` unchanged — they map to the `:root` custom properties
- Keep `--radius`, shadow tokens, and `@layer base` rules
- **Preserve sidebar and chart tokens:** The dashboard and Sidebar component use `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`, `--chart-1` through `--chart-5`. Do **not** remove these. Update them to hex-equivalent values consistent with the new palette (e.g., `--sidebar: #F8FAFC`, `--sidebar-foreground: #0F172A`, sidebar-primary/ring use `#4F46E5`, chart tokens use indigo/violet shades). The "replace all `:root` values" instruction means replace the 16 design tokens above **plus** update these 14 supporting tokens — not delete them.

**Verification:** Dev server shows white background with indigo primary buttons.

---

### U2 — Inter Font in layout.tsx

**Goal:** Replace Geist/Geist_Mono with Inter loaded globally.

**Files:**
- Modify: `app/layout.tsx`

**Approach:**
```
// Replace:
import { Geist, Geist_Mono } from 'next/font/google'
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// With:
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
```
- Apply `inter.variable` class to the `<html>` element
- In `globals.css` `:root`, change `--font-sans` from the current literal string `'Inter', 'Geist', sans-serif` to `var(--font-inter)` — this activates next/font's preload and display:swap optimizations. **If left as a literal string, Inter will render visually but without font optimization.**
- Update `<html>` className to use `inter.variable` only (drop geistSans.variable and geistMono.variable)
- Update page metadata: title stays `'AnswerMyDocs — Chat with your PDFs'`, description stays as-is

**Verification:** Body text renders in Inter (check font inspector in DevTools).

---

### U3 — Shared Motion Primitives

**Goal:** Create reusable `FadeUp` and `SectionHeader` components used across all sections.

**Files:**
- Create: `components/landing/shared/FadeUp.tsx`
- Create: `components/landing/shared/SectionHeader.tsx`

**Approach:**

`FadeUp.tsx` — `'use client'`, wraps children in `motion.div` with scroll-triggered fade-up animation. Use `initial={{ opacity: 0, y: 24 }}` + `whileInView={{ opacity: 1, y: 0 }}` + `viewport={{ once: true, margin: '-80px' }}` — **not** `animate`, which fires immediately on mount regardless of scroll position. Props: `children`, optional `delay` (number, default `0`), optional `className`.

`SectionHeader.tsx` — Server Component. Props: `eyebrow` (small badge text, optional), `title` (string), `subtitle` (string, optional), `centered` (boolean, default `true`). Renders a section badge + h2 + p with consistent spacing and typography.

**Verification:** FadeUp fades in when scrolled into view. SectionHeader renders correct hierarchy.

---

### U4 — Navbar

**Goal:** Sticky blur-on-scroll navbar with logo, nav links, and two CTA buttons.

**Files:**
- Create: `components/landing/Navbar.tsx`

**Approach:**
- `'use client'` (needs `useEffect` for scroll detection)
- Logo: text `AnswerMyDocs` with a small `FileText` Lucide icon, links to `/`
- Nav links: Features, Use Cases, Pricing, FAQ — smooth-scroll to section IDs (`#features`, `#use-cases`, `#pricing`, `#faq`)
- Buttons: "Sign In" (ghost variant → `/login`), "Start Free" (primary → `/signup`)
- Scroll effect: `useEffect` + `window.addEventListener('scroll')` → adds `backdrop-blur-md bg-white/90 border-b border-border` class when `scrollY > 10`
- Mobile: hamburger menu with sheet/drawer for small screens

**Verification:** Navbar blurs on scroll, links smooth-scroll to sections, both buttons navigate correctly.

---

### U5 — Hero Section

**Goal:** Full-screen hero with badge, headline, subheadline, CTAs, and trust text.

**Files:**
- Create: `components/landing/Hero.tsx`

**Approach:**
- Server Component (no interactivity needed)
- Badge: `✨ Free plan available • No credit card required` using shadcn `Badge` component (secondary variant)
- Headline: `Stop Reading PDFs.\nGet Answers in Seconds.` — two-line, text-7xl on desktop, text-5xl on tablet, text-4xl mobile
- Subheadline: as specified, max-w-2xl, text-secondary, text-lg/text-xl
- Primary CTA: "Upload PDF Free" → `/signup`, large Button with arrow icon
- Secondary CTA: "Watch Demo" → smooth-scroll to `#demo`, outline variant
- Trust text: small paragraph below CTAs, muted-foreground
- Background: pure white with a very subtle radial gradient behind the headline (`radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12), transparent)`)
- Section ID: `id="hero"`

**Verification:** Hero renders all copy, both buttons work, gradient is subtle not garish.

---

### U6 — Product Demo (Interactive Mockup)

**Goal:** Split-panel UI mockup showing a PDF viewer panel on the left and a chat conversation panel on the right with animated chat simulation.

**Files:**
- Create: `components/landing/ProductDemo.tsx`

**Approach:**
- `'use client'` (animated chat simulation)
- Section ID: `id="demo"`
- Layout: 2-column grid on `lg:`, stacked on mobile
- Left panel (PDF panel): styled as a browser-chrome card showing a fake PDF page — a grey rectangle with horizontal lines simulating text, a document title ("Q4 2024 Report.pdf"), and a page indicator
- Right panel (Chat panel): simulates a chat conversation
  - Shows the pre-baked question: `"What are the key findings from this report?"`
  - Then shows a streaming-effect answer (reveal word-by-word using `useEffect` + `setInterval` with 40ms delay)
  - Answer content (3 bullet points): "Revenue increased 27% YoY", "Customer retention improved by 14%", "Expansion into 3 new markets"
  - Sources row below the answer: `Page 12`, `Page 18`, `Page 34` as small pill badges
- The streaming animation loops: clears and replays every ~6s
- Visual design: rounded-xl card with subtle drop shadow, indigo accent on left border of chat messages

**Verification:** Animation plays, loops, doesn't flicker. Looks like a Perplexity-style interface.

---

### U7 — Social Proof Bar

**Goal:** Four metrics displayed in a horizontal bar.

**Files:**
- Create: `components/landing/SocialProof.tsx`

**Approach:**
- Server Component
- Section ID: `id="social-proof"`
- Four stat cards in a 4-column grid: 50,000+ / Questions Answered, 10,000+ / Documents Processed, 99% / Citation Accuracy, 4.9/5 / User Satisfaction
- Style: light indigo background (`bg-primary/5`), full-width strip, centered numbers in `text-4xl font-bold text-primary`, labels in `text-sm text-secondary`
- Subtle dividers between stats on desktop

**Verification:** All four metrics display correctly, responsive grid stacks on mobile.

---

### U8 — Problem Section

**Goal:** Three cards describing the pain points for students, researchers, and teams.

**Files:**
- Create: `components/landing/Problem.tsx`

**Approach:**
- Server Component, wrap with `FadeUp` for reveal
- Section ID: `id="problem"`
- Headline: "Reading Documents Shouldn't Take Hours"
- Three cards using shadcn `Card` component:
  - Students: `GraduationCap` icon, "Stop digging through 100-page research papers."
  - Researchers: `Microscope` icon, "Find evidence and citations instantly."
  - Teams: `Users` icon, "Search across all company documents."
- Cards: white with border, hover `shadow-md` transition

**Verification:** Three cards render with icons, hover state works.

---

### U9 — How It Works

**Goal:** Three large numbered steps with icons and descriptions.

**Files:**
- Create: `components/landing/HowItWorks.tsx`

**Approach:**
- Server Component, wrap each step in `FadeUp` with stagger
- Section ID: `id="how-it-works"`
- Section eyebrow: "Simple by Design"
- Headline: "Three steps to stop reading, start knowing"
- Steps rendered as a 3-column grid on desktop, single column on mobile:
  1. Upload PDFs — `Upload` icon, "Drag and drop any PDF. We handle the rest."
  2. Ask Questions — `MessageSquare` icon, "Use plain English. No search queries."
  3. Get Verified Answers — `CheckCircle` icon, "Every answer includes the exact page."
- Step number displayed as large muted numeral (`01`, `02`, `03`) above each card
- Connecting arrows between steps on desktop (decorative)

**Verification:** Three steps display with correct content and stagger animation.

---

### U10 — Feature Showcase

**Goal:** Four alternating-layout feature sections, each with text on one side and a product mockup on the other.

**Files:**
- Create: `components/landing/FeatureShowcase.tsx`

**Approach:**
- Server Component, wrap each feature row in `FadeUp`
- Section ID: `id="features"`
- Section eyebrow: "Built for depth"
- Headline: "Features that match how you actually work"
- Four features in alternating left/right layout (even = text left, odd = text right):
  1. **Multi-Document Search** — `Search` icon. Text: "Ask one question across your entire library. AnswerMyDocs searches all uploaded documents simultaneously." Mockup: a search bar with multiple document chips below it
  2. **Source Citations** — `BookOpen` icon. Text: "Every answer includes the exact page number. Click any citation to jump directly to the supporting passage." Mockup: an answer card with highlighted page references
  3. **Agentic Research** — `Cpu` icon. Text: "The AI automatically reformulates its search when the first result isn't sufficient. You get better answers without rephrasing." Mockup: a "Searching deeper…" UI with step indicators
  4. **Streaming Responses** — `Zap` icon. Text: "Answers start appearing instantly. No waiting for the full response before you begin reading." Mockup: a partial answer with a blinking cursor
- Mockups are styled HTML/CSS (no images): rounded-xl, border, shadow-sm, bg-muted

**Verification:** Four features alternate layout, mockups are distinct per feature.

---

### U11 — Use Cases

**Goal:** Six hover-state cards for different user types.

**Files:**
- Create: `components/landing/UseCases.tsx`

**Approach:**
- Server Component, wrap grid in `FadeUp`
- Section ID: `id="use-cases"`
- Section eyebrow: "Who uses AnswerMyDocs"
- Headline: "From PhDs to product teams"
- Six cards in a 3-column grid (2-column tablet, 1-column mobile):
  1. Academic Research — `Microscope`, "Synthesize literature across 50 papers in minutes"
  2. Legal Review — `Scale`, "Find contract clauses and case precedents instantly"
  3. Business Reports — `BarChart2`, "Extract KPIs and insights from quarterly reports"
  4. Books & Learning — `BookOpen`, "Ask questions while you read"
  5. Contracts — `FileCheck`, "Never miss a clause or deadline again"
  6. Internal Knowledge Bases — `Database`, "Search your company's documents like Google"
- Cards: white, border, `hover:border-primary hover:shadow-md` transition, icon in `text-primary`, title bold, description muted

**Verification:** Six cards render, hover border/shadow works.

---

### U12 — Comparison Table

**Goal:** Feature comparison table highlighting AnswerMyDocs vs competitors.

**Files:**
- Create: `components/landing/ComparisonTable.tsx`

**Approach:**
- Server Component
- Section ID: `id="comparison"`
- Section eyebrow: "Why AnswerMyDocs"
- Headline: "Compare and decide"
- Table with 4 columns: Feature, AnswerMyDocs, ChatPDF, AskYourPDF
- 5 rows: Source Citations, Multi-Document Search, Agentic Retrieval, Private Workspaces, Streaming Responses
- AnswerMyDocs column: all ✓ (green `CheckCircle` in `text-primary`)
- Competitor columns: mix of ✓ (neutral Check) and ✗ (red `X` in `text-destructive`). ChatPDF lacks Agentic Retrieval and Streaming. AskYourPDF lacks Multi-Document Search, Agentic Retrieval, and Private Workspaces.
- AnswerMyDocs column header: styled with primary background highlight (`bg-primary/10 font-semibold`)
- Wrapper: overflow-x-auto for mobile

**Verification:** Table renders all 5 rows × 4 columns, AnswerMyDocs column is visually distinct.

---

### U13 — Testimonials

**Goal:** Three premium testimonial cards with avatars and outcome-focused quotes.

**Files:**
- Create: `components/landing/Testimonials.tsx`

**Approach:**
- Server Component, wrap with `FadeUp`
- Section ID: `id="testimonials"`
- Section eyebrow: "What people say"
- Headline: "Real workflows, real results"
- Three cards in a 3-column grid:
  1. **Layla Hassan, PhD Candidate, MIT** — "I used to spend 3 hours literature reviewing before each chapter. Now I upload all 40 papers and ask AnswerMyDocs to find contradicting findings. Takes 8 minutes."
  2. **Marcus Chen, Product Manager at Stripe** — "Our team uploads every competitor announcement, analyst report, and board deck. Asking questions across 200 docs simultaneously has changed how we do strategy."
  3. **Priya Nakamura, Strategy Consultant** — "Client due diligence used to mean 60-hour weeks of manual review. I can now extract the same insights from 300-page data rooms in an afternoon."
- Avatars: generated from initials using a styled div (`rounded-full bg-primary/10 text-primary font-semibold`) — no external image services
- Card: white, border, shadow-sm, 5-star rating row at top, quote, divider, avatar + name + role

**Verification:** Three cards render, no external images, quote text is correct.

---

### U14 — Pricing

**Goal:** Two pricing tiers with annual billing toggle and highlighted Pro plan.

**Files:**
- Create: `components/landing/Pricing.tsx`

**Approach:**
- `'use client'` (billing toggle state)
- Section ID: `id="pricing"`
- Section eyebrow: "Pricing"
- Headline: "Start free. Scale when ready."
- Annual billing toggle: `useState(false)` for `isAnnual`. When annual, show "Save 20%" badge and update price to `$15/mo`.
- Two cards side by side (stacked on mobile):

**Free — $0/mo**
- 3 documents
- 50 questions/month
- Source citations
- 1 workspace
- CTA: "Get Started Free" → `/signup`

**Pro — $19/mo (or $15/mo annually)**
- Badge: "Most Popular" (`bg-primary text-white text-xs rounded-full`)
- Unlimited documents
- Unlimited questions
- Source citations
- 10 workspaces
- Agentic retrieval
- Priority support
- CTA: "Start Pro Free Trial" → `/signup?plan=pro`
- Visual: subtle `ring-2 ring-primary` border, very faint `bg-primary/5` background, subtle indigo glow — apply as an inline `style` prop: `style={{ boxShadow: '0 0 60px rgba(79,70,229,0.12)' }}`. No Tailwind utility exists for this value in v4.

- Pricing cards use shadcn `Card` component
- Feature list items use `Check` icon in `text-primary`

**Verification:** Toggle switches price, Pro card has ring + glow, both CTAs work.

---

### U15 — FAQ

**Goal:** Animated accordion with 6 questions.

**Files:**
- Create: `components/landing/FAQ.tsx`

**Approach:**
- **`'use client'`** — the underlying `@radix-ui/react-accordion` ships with `'use client'` at the top of its bundle; the generated shadcn wrapper inherits this. FAQ.tsx must be a client component.
- Section ID: `id="faq"`
- Section eyebrow: "FAQ"
- Headline: "Everything you need to know"
- Uses shadcn `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` components (requires `npx shadcn@latest add accordion` prerequisite)
- 6 questions:
  1. **Is my data private?** — "Yes. Your documents are stored privately. We never use your data for training. Each workspace is isolated."
  2. **How many documents can I upload?** — "Free plan: 3 documents. Pro: unlimited."
  3. **What file types are supported?** — "PDFs only, up to 100MB per file."
  4. **How accurate are the source citations?** — "Citations link directly to specific pages in your documents. The AI quotes verbatim from the source text."
  5. **Can I cancel my Pro subscription?** — "Yes, anytime. No questions asked. You retain access until your billing period ends."
  6. **Is there a free trial for Pro?** — "Yes. Pro includes a 14-day free trial with no credit card required."
- `type="single" collapsible` on the Accordion

**Verification:** Accordion opens/closes, all 6 items present.

---

### U16 — Final CTA

**Goal:** Full-width closing CTA section with headline, subheadline, and primary button.

**Files:**
- Create: `components/landing/FinalCTA.tsx`

**Approach:**
- Server Component, wrap in `FadeUp`
- Section ID: `id="cta"`
- Background: subtle indigo gradient (`bg-gradient-to-br from-primary/8 via-white to-accent/6`)
- Headline: "Your Next Answer Is Already Inside Your PDF"
- Subheadline: "Upload a document and start chatting in seconds. No credit card required."
- Button: "Upload PDF Free" → `/signup`, large primary, with `ArrowRight` icon
- Small text below: "Join 10,000+ students, researchers, and teams"
- Padding: `py-32`

**Verification:** Gradient renders subtly, button navigates correctly.

---

### U17 — Footer

**Goal:** Clean footer with logo, nav links, and social icons.

**Files:**
- Create: `components/landing/Footer.tsx`

**Approach:**
- Server Component
- Layout: logo + tagline on left, link columns in center, social icons on right
- Logo: same as Navbar (text + icon)
- Tagline: "AI-powered answers from your documents."
- Link columns:
  - Product: Features, Pricing, Use Cases, FAQ
  - Company: About, Blog, Careers
  - Legal: Privacy Policy, Terms of Service, Contact
- Social: GitHub and X (Twitter) — **do not use `Github` or `Twitter` from lucide-react; these icons were removed in lucide v1.x and do not exist in the installed v1.21**. Use inline SVG paths or plain text links: `<a href="#">GitHub</a>` and `<a href="#">X</a>` as styled anchor tags
- Bottom bar: "© 2026 AnswerMyDocs. All rights reserved."
- Style: `bg-muted/50 border-t border-border`

**Verification:** All links render, columns are correctly labeled.

---

### U18 — Root Page Assembly

**Goal:** Replace `app/page.tsx` with the 14-section composition and SEO metadata.

**Files:**
- Modify: `app/page.tsx`

**Approach:**
- Server Component (no client state at the page level)
- Import all 14 `components/landing/*` components
- Compose them in order: `Navbar`, `Hero`, `ProductDemo`, `SocialProof`, `Problem`, `HowItWorks`, `FeatureShowcase`, `UseCases`, `ComparisonTable`, `Testimonials`, `Pricing`, `FAQ`, `FinalCTA`, `Footer`
- Export `generateMetadata()` for SEO:
  ```
  title: "AnswerMyDocs — Get Answers from Your PDFs in Seconds"
  description: "Upload PDFs and ask questions in plain English. Get source-cited answers instantly. Used by 10,000+ researchers, students, and teams."
  openGraph: { type: "website", title: ..., description: ... }
  ```
- Wrap the whole page in a `<div className="min-h-screen bg-background text-foreground font-sans">` root

**Verification:** All 14 sections render sequentially, page has correct `<title>` in browser tab.

---

## Key Technical Decisions

### Framer Motion in Server Components
Framer Motion components require `'use client'`. The `FadeUp` wrapper is the only client-side Framer Motion boundary — all section components that need animation import `FadeUp` and remain Server Components themselves. This keeps the client bundle small.

### No External Images
All visual mockups and avatars are built from styled HTML/CSS/Tailwind — no `<img>` tags pointing to external URLs. Avatars use initials in styled divs. Product mockups use border + shadow + bg-muted cards with decorative content. This ensures no broken images and no privacy concerns.

### Smooth Scroll
Nav links use `href="#section-id"` with CSS `scroll-behavior: smooth` in `globals.css` (`html { scroll-behavior: smooth; }`).

### Responsive Breakpoints
- Mobile first: single column
- `md:` (768px): 2 columns where applicable
- `lg:` (1024px): full desktop layout (3-column, alternating features)

### shadcn components used
- `Button` (variant: default, outline, ghost)
- `Badge` (variant: secondary)
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` (requires install)

---

## Dependencies and Sequencing

```
U1 (globals.css) ──┐
U2 (layout.tsx)  ──┤
U3 (shared/)     ──┼──> U4–U17 (all sections) ──> U18 (page assembly)
```

U1 and U2 are independent of each other and must both complete before sections look correct. U3 must complete before sections that use `FadeUp` or `SectionHeader`. U4–U17 sections are independent of each other and can be built in any order. U18 depends on all sections.

---

## Test Scenarios

The landing page is pure presentation with no business logic — there is no unit test surface. Visual verification is the test strategy.

| Scenario | How to verify |
|---|---|
| All 14 sections render without console errors | `npm run dev` → browse to `/`, open DevTools |
| No broken images or missing icons | Visual scan, check network tab for 404s |
| Smooth scroll from nav links | Click Features / Use Cases / Pricing / FAQ |
| Pricing toggle switches between monthly/annual | Click toggle |
| FAQ accordion opens/closes | Click each item |
| ProductDemo animation plays and loops | Watch for ~8 seconds |
| Mobile layout correct at 375px | Chrome DevTools responsive mode |
| Inter font loads | DevTools Elements → computed font-family |
| Primary buttons navigate to `/signup` | Click "Start Free" / "Upload PDF Free" |

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Framer Motion SSR hydration mismatch | Wrap animated components in `'use client'`, use `AnimatePresence` only where needed |
| Accordion import fails if shadcn not installed | prerequisite step documented clearly |
| globals.css replacement breaks chat UI | Chat uses same tokens (bg-background, text-foreground, etc.) which map to the new hex values — visually consistent |
| Duplicate `@import "tailwindcss"` in current globals.css | Remove the duplicate as part of U1 |
| `scroll-behavior: smooth` causes layout shift | Apply to `html` element only, not body |
