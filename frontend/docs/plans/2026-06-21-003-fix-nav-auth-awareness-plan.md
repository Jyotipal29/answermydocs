---
title: "fix: Restore back-to-home nav and make landing Navbar auth-aware"
date: 2026-06-21
type: fix
status: draft
---

# fix: Restore back-to-home nav and make landing Navbar auth-aware

## Summary

Two navigation gaps leave logged-in users stranded: (1) the app sidebar has no link back to the landing page at `/`, and (2) the landing page Navbar always shows "Sign In / Start Free" even for users with a valid session cookie, making them think they need to log in again. Both issues are client-side UI changes with no backend or auth logic involved.

## Problem Frame

The app sidebar logo links to `/dashboard` (app home). There is no path from the chat or dashboard UI back to `/` (the marketing/landing page). When a user navigates to `/` manually, `AuthBootstrap` in `providers.tsx` re-hydrates their session from the cookie correctly — but the landing Navbar ignores auth state entirely, showing auth buttons that imply the user is logged out. This creates the false impression that the session was lost.

## Requirements

- R1: From any page in the app, the user can reach the landing page (`/`) in one click.
- R2: On the landing page, a logged-in user sees a "Dashboard" CTA instead of "Sign In / Start Free."
- R3: Session state is not modified — token cookie handling is unchanged.

---

## Implementation Units

### U1. Add home link to app Sidebar

**Goal:** Give logged-in users a one-click path from the app back to the landing page.

**Requirements:** R1

**Dependencies:** none

**Files:**
- `frontend/components/layout/Sidebar.tsx` (modify)

**Approach:** Change the top logo `Link` `href` from `/dashboard` to `/`. The "Documents" nav item already provides the dashboard shortcut, so the logo becoming a home link follows standard SaaS UX (app logo → product home). No other sidebar changes needed.

**Patterns to follow:** Existing `Link` usage in `Sidebar.tsx` line 49.

**Test scenarios:**
- Clicking the AnswerMyDocs logo while on `/chat/[id]` navigates to `/`.
- Clicking the AnswerMyDocs logo while on `/dashboard` navigates to `/`.
- "Documents" nav item still navigates to `/dashboard`.

**Verification:** Logo href is `/`; Documents nav item href remains `/dashboard`. No broken links.

---

### U2. Make landing Navbar auth-aware

**Goal:** Show logged-in users a "Dashboard" button (and hide "Sign In / Start Free") when their session is active on the landing page.

**Requirements:** R2

**Dependencies:** none

**Files:**
- `frontend/components/landing/Navbar.tsx` (modify)

**Approach:** Import `useAuthStore` and read `user` and `isLoading` from it. The `AuthBootstrap` in `providers.tsx` already re-hydrates auth from the cookie on mount, so by the time the Navbar renders interactively the store reflects true auth state.

Two rendering states:
- `isLoading === true` → render nothing in the auth button area (or a skeleton) to avoid a flash of wrong state.
- `user !== null` → replace "Sign In" + "Start Free" with a single "Dashboard →" `Button` linking to `/dashboard`.
- `user === null && !isLoading` → render existing "Sign In" + "Start Free" buttons unchanged.

The mobile menu follows the same conditional render.

**Patterns to follow:** `useAuthStore` usage in `frontend/components/layout/Sidebar.tsx`.

**Test scenarios:**
- Unauthenticated visitor on `/`: sees "Sign In" and "Start Free" buttons.
- Authenticated user on `/`: sees "Dashboard →" button; "Sign In" / "Start Free" are not rendered.
- During `isLoading`: auth button area is empty (no flash of wrong state).
- Mobile menu: same conditional — authenticated user sees "Dashboard →", not the login/signup buttons.
- Clicking "Dashboard →" navigates to `/dashboard`.

**Verification:** Auth button area shows correct state for both authenticated and unauthenticated sessions; no flash of unauthenticated state on page load for cookie-holding users.

---

## Scope Boundaries

**In scope:**
- Sidebar logo `href` change.
- Landing Navbar conditional rendering based on `useAuthStore`.

**Out of scope / Deferred to Follow-Up Work:**
- Next.js middleware-based route protection (no redirect logic is added or changed).
- Any changes to token storage, cookie expiry, or auth API calls.
- Dedicated "account" menu or user avatar in the landing Navbar.

---

## Key Technical Decisions

**KTD1: Logo → `/` instead of adding a dedicated "Home" nav item.**
A standalone "Home" nav item that links to a marketing page from inside the app would be unusual. Repurposing the logo link is the conventional pattern and avoids adding noise to the sidebar nav.

**KTD2: Read `isLoading` to suppress flash of wrong auth state.**
Without it, the Navbar would briefly show "Sign In" on every page load for authenticated users before the cookie hydration finishes. `AuthBootstrap` sets `isLoading: false` after the `/me` call settles, so guarding on it is sufficient.
