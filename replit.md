# MinkahEnterprises Church Community Platform

## Overview

MinkahEnterprises is a multi-tenant SaaS platform designed for church community management. The platform enables multiple churches to operate independently with their own members, events, messaging, and administrative controls. It features a three-tier role system (Super Admin, Church Admin, Member) with distinct capabilities and interfaces for each role.

The application serves as a comprehensive community management solution with features including member management, event planning with RSVP tracking, real-time messaging, digital check-ins, ministry team organization, and invitation-based onboarding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management, caching, and automatic refetching

**UI Component System**
- Shadcn UI component library (New York style variant) built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Design system inspired by Linear (admin clarity), Slack (messaging), and Stripe (payment trust)
- Typography: Inter (primary sans-serif) and Crimson Pro (accent serif for headings)
- Custom theme with HSL-based color system supporting light/dark modes via CSS variables

**State Management Pattern**
- Server state handled by TanStack Query with aggressive caching (staleTime: Infinity)
- Form state managed by React Hook Form with Zod schema validation
- Real-time updates via WebSocket connections for messaging features
- Local UI state kept in component-level useState/useReducer

**Authentication Flow**
- Session-based authentication using Replit's OpenID Connect provider
- Passport.js strategy for OAuth 2.0 / OIDC integration
- Session persistence in PostgreSQL via connect-pg-simple
- Protected routes check authentication status and role permissions client-side
- Automatic redirect to `/api/login` for unauthenticated users

### Backend Architecture

**Server Framework**
- Express.js running on Node.js with TypeScript
- RESTful API design with `/api/*` prefix for all endpoints
- Session middleware applied before route handlers for authentication
- Custom middleware for role-based access control (Super Admin, Church Admin, Member)

**Database Layer**
- PostgreSQL database (provisioned via Neon serverless)
- Drizzle ORM for type-safe database queries and migrations
- Schema-first approach with shared TypeScript types between client and server
- Connection pooling via `@neondatabase/serverless` with WebSocket support

**Real-Time Communication**
- WebSocket server (ws library) for bi-directional messaging
- Channel-based message architecture with connection registry tracking authenticated clients
- Session middleware applied to WebSocket upgrade requests for authentication
- Automatic reconnection and message synchronization handled client-side

**Multi-Tenancy Model**
- Church entity as the primary tenant boundary
- Users belong to a single church (churchId foreign key) except Super Admins (churchId: null)
- Row-level data isolation enforced in storage layer queries
- Super Admins can view/manage all churches; Church Admins scope to their church only

**Storage Layer Pattern**
- `IStorage` interface defines all data operations in `server/storage.ts`
- Drizzle queries encapsulated behind storage methods for clean separation
- Automatic timestamp management (createdAt, updatedAt) on relevant tables
- Soft deletes not implemented; using cascade deletes for referential integrity

### Key Architectural Decisions

**Role-Based Access Control**
- Three-tier system: `super_admin` (platform owner), `church_admin` (church leader), `member` (congregation)
- Super Admins approve pending church registrations before they become active
- Church Admins can invite members via email with token-based acceptance flow
- Role transitions handled server-side with validation to prevent privilege escalation

**Invitation System**
- Token-based invitations with status tracking (pending, accepted, declined, expired)
- Rate limiting: 10 invitations per hour per user to prevent abuse
- Email invitations generate unique tokens stored in database
- Accepting invitation creates user account and assigns to church with specified role

**Event Management**
- Events belong to churches with RSVP tracking per member
- Three RSVP states: going, maybe, not_going
- Event creators can be Church Admins or designated event coordinators
- Future enhancement: recurring events (not yet implemented)

**Messaging Architecture**
- Message channels scoped to churches (general, announcements, prayer-requests, etc.)
- WebSocket connections authenticated via Express session middleware
- Messages stored in PostgreSQL with sender/channel/timestamp tracking
- Polling fallback (3-second interval) for clients with WebSocket connection issues

**Ministry Teams System**
- Hierarchical team structure with roles: leader, co_leader, member, volunteer
- Teams belong to churches with name, description, and member assignments
- Single leader constraint enforced via partial unique index on (teamId, role) WHERE role = 'leader'
- Church Admins can create/edit/delete teams and assign members with specific roles
- Member directory at `/team-directory` shows all teams with nested member data (accessible to all authenticated church members)
- Admin management interface at `/ministry-teams` for CRUD operations (restricted to Church Admins)
- Efficient data fetching: `getMinistryTeamsWithMembers()` uses two queries with in-memory grouping
- Null-safe rendering for users without complete profile data (fallback to email for display)
- Separate API endpoints: `/api/ministry-teams` (admin-only) and `/api/team-directory` (all members)

**Check-In System**
- Digital attendance tracking with optional notes field
- Check-ins belong to both user and church for reporting purposes
- Recent check-ins dashboard for Church Admins to monitor engagement
- Individual check-in history visible to members

## External Dependencies

**Authentication & Identity**
- Replit Auth (OpenID Connect provider) for user authentication
- Uses standard OAuth 2.0 authorization code flow
- User profile data (email, name, profile image) synced from Replit on login
- Session cookies secured with httpOnly, secure flags, and 7-day TTL

**Database**
- PostgreSQL (via Neon serverless platform)
- Configured via DATABASE_URL environment variable
- WebSocket-based connection protocol for serverless compatibility
- Session storage table (`sessions`) required for express-session

**Third-Party Libraries**
- Stripe integration scaffolded (not yet implemented) for future payment features
- Date manipulation via date-fns for consistent formatting
- Form validation via Zod schemas shared between client and server
- UI components from Radix UI primitives (no external component library dependencies)

**Development Tools**
- Replit-specific Vite plugins for error overlays, cartographer, and dev banner
- TypeScript with strict mode enabled for compile-time safety
- ESBuild for production server bundling
- Drizzle Kit for database migrations and schema management

**Environment Configuration**
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Secure random string for session encryption (required)
- `ISSUER_URL`: Replit OIDC issuer URL (defaults to replit.com/oidc)
- `REPL_ID`: Replit application identifier (auto-provided in Replit environment)
- `NODE_ENV`: development or production mode toggle