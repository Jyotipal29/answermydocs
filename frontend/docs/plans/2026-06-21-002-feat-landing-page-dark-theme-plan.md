---
id: 2026-06-21-002
title: "feat: Landing Page Dark Theme"
type: feat
status: ready
origin: user-prompt (ce-plan invocation 2026-06-21)
---

# Landing Page Dark Theme

## Problem Frame

The landing page (`app/page.tsx` and `components/landing/`) was built with a light background. The user wants a dark-themed landing page. The `globals.css` already defines complete dark-mode CSS variable values (`--background: #0F172A`, `--foreground: #F8FAFC`, etc.) via the `.dark` class selector. The fix is to activate those variables on the landing page root and replace the hardcoded `bg-white` references that would otherwise appear as bright white islands on a dark background.

## Scope Boundary

- **In:** `app/page.tsx` and `components/landing/` only — visual dark theme for the public landing page
- **Out:** dashboard, chat UI, auth pages — those remain unaffected (not wrapped in `dark`)

---

## Implementation Units

### U1. Activate Dark Mode on Landing Page Root

**Goal:** Add `dark` class to the landing page root div so all CSS variables cascade to their dark-mode values for every child component.

**Files:**
- Modify: `app/page.tsx`

**Approach:**
- The existing `@custom-variant dark (&:is(.dark *))` declaration in `globals.css` makes all dark-mode CSS variable overrides fire when any ancestor carries the `dark` class
- Change the outer `<div>` in `LandingPage` from `className="min-h-screen bg-background text-foreground font-sans"` to add `dark` before the other classes: `className="dark min-h-screen bg-background text-foreground font-sans"`
- No other logic changes needed here — the CSS cascade handles the rest

**Dependencies:** none

**Test scenarios:**
- Page background renders as `#0F172A` (dark navy), not white
- Body text renders as `#F8FAFC` (near-white), not dark
- Primary buttons remain indigo (now `#6366F1` per dark-mode `--primary`)
- Dashboard and chat pages at `/chat` and `/dashboard` are unaffected (not wrapped in `dark`)

**Verification:** Open `/` — background is dark. Open `/chat` — background is still light.

---

### U2. Replace Hardcoded `bg-white` with Semantic Tokens

**Goal:** Replace every `bg-white` in landing components with `bg-card` or `bg-background` so they render as dark surfaces rather than bright white blobs.

**Files:**
- Modify: `components/landing/Navbar.tsx`
- Modify: `components/landing/ProductDemo.tsx`
- Modify: `components/landing/FeatureShowcase.tsx`
- Modify: `components/landing/ComparisonTable.tsx`
- Modify: `components/landing/FAQ.tsx`

**Approach (per file):**

`Navbar.tsx` — two instances:
- Scrolled backdrop: `bg-white/90` → `bg-background/90`
- Mobile menu panel: `bg-white border-b` → `bg-background border-b`

`ProductDemo.tsx` — two instances (PDF panel and chat panel):
- Both `bg-white shadow-sm` → `bg-card shadow-sm`

`FeatureShowcase.tsx` — four mockup panels:
- All `bg-white p-5` → `bg-card p-5`

`ComparisonTable.tsx` — alternating row striping:
- `fi % 2 === 0 ? 'bg-white' : 'bg-muted/30'` → `fi % 2 === 0 ? 'bg-card' : 'bg-muted/30'`

`FAQ.tsx` — accordion item background:
- `bg-white data-[state=open]:border-primary/30` → `bg-card data-[state=open]:border-primary/30`

**Note:** `Pricing.tsx` has `bg-white` only on the toggle switch thumb (the circular knob) — leave that as `bg-white`. A white thumb on a dark track is correct UI behavior.

**Dependencies:** U1

**Test scenarios:**
- Navbar scrolled state has a dark translucent background, not white
- Mobile nav dropdown is dark, not white
- Product demo panels (PDF viewer + chat) are dark card surfaces
- Feature showcase mockup cards are dark
- Comparison table alternating rows are dark with subtle contrast
- FAQ accordion items open with dark card background

**Verification:** Scroll the landing page fully — no white islands appear anywhere.

---

### U3. Fix Inline Gradient in FinalCTA for Dark Background

**Goal:** Update the `FinalCTA` section's inline gradient so its center blends with the dark background rather than creating a white blob.

**Files:**
- Modify: `components/landing/FinalCTA.tsx`

**Approach:**
- Current gradient: `linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(255,255,255,1) 50%, rgba(99,102,241,0.04) 100%)`
- The `rgba(255,255,255,1)` at the midpoint creates a stark white center on a dark page
- Replace with: `linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(15,23,42,1) 50%, rgba(99,102,241,0.10) 100%)`
  - `rgba(15,23,42,1)` is `#0F172A` — the dark background color
  - Slightly increased indigo opacity at the edges so the gradient reads as a subtle glow on dark

**Dependencies:** U1

**Test scenarios:**
- FinalCTA section has no white or near-white area — background blends smoothly with the dark page
- Subtle indigo gradient edges are still faintly visible

**Verification:** Final CTA section looks like a natural continuation of the dark page, with a barely perceptible indigo warmth.

---

## Dependencies and Sequencing

```
U1 (dark class on root) → U2 (bg-white replacements) → U3 (FinalCTA gradient)
```

U2 and U3 can be applied in either order once U1 is done, but U1 must go first so changes can be visually verified.

---

## Test Scenarios (page-level)

| Scenario | How to verify |
|---|---|
| No white surfaces anywhere on the page | Scroll from top to footer — zero visible white areas |
| Primary indigo buttons visible on dark background | "Upload PDF Free", "Start Free", etc. all clearly readable |
| Navbar blur-on-scroll is dark, not light | Scroll 50px — navbar becomes dark translucent |
| Social proof bar distinct from dark background | Metrics section has visible contrast |
| Pricing Pro card glow visible on dark | Indigo glow renders correctly on dark card |
| Hero gradient still subtle | Radial indigo glow at top of hero section is still delicate |
| FinalCTA blends with rest of page | No bright patch at bottom of page |
| Chat/dashboard pages unaffected | `/chat` and `/login` still render with light background |
