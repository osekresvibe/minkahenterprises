# Design Guidelines: MinkahEnterprises Church Community Platform

## Design Approach

**Hybrid System-Reference Model:** Combining Shadcn UI component system with inspiration from Linear (admin clarity), Slack (community messaging), and Stripe (payment trust). Faith-based aesthetic requires warmth while maintaining professional credibility for financial transactions.

## Core Design Principles

1. **Trustworthy Clarity:** Clean, uncluttered interfaces that inspire confidence for donations and member data
2. **Community Warmth:** Welcoming visual language that reflects church community values
3. **Multi-Role Hierarchy:** Clear visual distinction between Super Admin, Church Admin, and Member views
4. **Mobile-First Responsive:** Member experience prioritizes mobile; admin tools optimize for desktop

## Typography

- **Primary Font:** Inter (Google Fonts) - clean, professional, excellent readability
- **Accent Font:** Crimson Pro (Google Fonts) - serif accent for headings, adds warmth and tradition
- **Hierarchy:**
  - Hero/Page Titles: Crimson Pro, 3xl to 5xl, font-semibold
  - Section Headings: Inter, xl to 2xl, font-semibold
  - Body Text: Inter, base, font-normal
  - Labels/Meta: Inter, sm, font-medium
  - Buttons: Inter, sm to base, font-medium

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Tight spacing: p-2, gap-2 (compact lists, tight groups)
- Standard spacing: p-4, gap-4, mb-6 (cards, form fields)
- Section spacing: py-12, py-16, py-20 (page sections)
- Generous spacing: p-8, gap-8 (featured content, hero areas)

**Container Strategy:**
- Max-width constraints: max-w-7xl for main content, max-w-md for forms
- Consistent horizontal padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)

## Component Library

### Navigation
**Admin Sidebar:** Fixed left sidebar (w-64), church logo at top, navigation items with icons (Heroicons), active state with subtle background, collapse to icon-only on mobile
**Member Top Nav:** Sticky header with church name/logo, search, notifications bell, profile avatar

### Cards & Containers
- **Church Profile Cards:** Rounded-lg, shadow-sm, p-6, hover:shadow-md transition
- **Member Cards:** Compact design with avatar (rounded-full, h-12 w-12), name, role badge
- **Post/News Cards:** Featured image at top (aspect-ratio-16/9), content below, timestamp, engagement actions
- **Event Cards:** Date badge in corner (absolute positioning), event image, title, RSVP button

### Forms & Inputs
- **Standard Inputs:** Rounded-md, border, p-3, focus:ring-2, clear label positioning (mb-2)
- **Select Dropdowns:** Match input styling, Heroicons chevron-down icon
- **Checkboxes/Radio:** Rounded (checkbox), rounded-full (radio), accent color on checked
- **Donation Amount Selector:** Button grid layout (grid-cols-3), custom amount input option
- **Submit Buttons:** Primary CTA style, w-full on mobile, min-w-32 on desktop

### Data Display
- **Member Directory:** Table view (desktop) with sortable columns, card grid (mobile)
- **Check-in History:** Timeline layout with date markers, attendance percentage metrics
- **Donation Reports:** Summary cards with large numbers, line graph for trends, filterable date range
- **Event Calendar:** Month grid view with event dots, list view toggle, upcoming events sidebar

### Messaging
- **Chat Interface:** Split layout - channels list (w-64), message thread (flex-1), thread sidebar (w-80, optional)
- **Message Bubbles:** Rounded-2xl, p-3, sender bubbles aligned right with distinct background
- **Channel List Items:** Unread badge (rounded-full, absolute top-right), last message preview

### Payments
- **Donation Flow:** Multi-step form with progress indicator, amount → frequency → payment method → confirmation
- **Payment Cards:** Stripe-inspired, clean white cards with subtle shadow, lock icon for security reassurance
- **Receipt View:** Printable layout, church letterhead styling, transaction details table

### Modals & Overlays
- **Confirmation Dialogs:** Centered, max-w-md, rounded-lg, p-6, clear action buttons
- **Full-Screen Forms:** Member registration, church onboarding - slide-in from right, close button top-left
- **Image Lightbox:** Dark overlay (bg-black/80), centered image, navigation arrows, close button

## Responsive Breakpoints

- Mobile: base (forms stack, sidebar becomes bottom nav)
- Tablet: md (two-column layouts, expanded cards)
- Desktop: lg (full sidebar, three-column grids, optimal data tables)

## Iconography

**Icon Library:** Heroicons (outline for navigation, solid for actions)
- Navigation: home, users, calendar, chat-bubble-left-right, currency-dollar, cog
- Actions: plus, pencil, trash, check, x-mark
- Status: check-circle (approved), clock (pending), exclamation-triangle (alert)

## Images

**Hero Sections:**
- **Public Landing (Pre-Login):** Large hero image showing diverse church community gathering, warm lighting, aspect-ratio-21/9, with frosted-glass overlay for CTA buttons
- **Church Admin Dashboard:** Banner image of their church building (uploaded by admin), aspect-ratio-5/1, subtle gradient overlay
- **Member Feed:** No dedicated hero - immediate feed of posts with inline images

**Content Images:**
- Event featured images: aspect-ratio-16/9, rounded-lg
- News post images: aspect-ratio-4/3, full-width in cards
- Church profile header: aspect-ratio-21/9, subtle overlay for text readability
- Member avatars: rounded-full, consistent sizes (h-8, h-12, h-16 variants)
- Pastor/staff profiles: rounded-lg, aspect-ratio-3/4, professional headshots

## Key Screen Compositions

**Super Admin Dashboard:** Metrics cards grid (grid-cols-1 md:grid-cols-3), pending church approvals table, recent activity feed

**Church Admin Dashboard:** Church stats summary, quick actions panel, upcoming events carousel, recent member check-ins list

**Member Home Feed:** Infinite scroll feed, floating action button (bottom-right) for new post, stories-style quick access to upcoming events at top

**Donation Page:** Impactful header with mission statement, prominent amount selector, recurring option toggle, secure payment badge, past donations history below

**Event Detail:** Full-width event image, event info card overlapping image (negative margin), RSVP section, attendee avatars, comments section

## Animation Guidelines

**Minimal, Purposeful Motion:**
- Page transitions: Simple fade (duration-200)
- Button interactions: Scale on tap (active:scale-95)
- Card hovers: Shadow elevation (transition-shadow duration-200)
- Modal entry: Slide + fade (duration-300)
- **Avoid:** Parallax, scroll-triggered animations, loading spinners beyond simple fade