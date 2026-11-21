# MedVault — Medical Revision Questions Bank

Production-grade, responsive, and scalable medical revision platform built with **Next.js (App Router), TypeScript, Tailwind CSS, Prisma, and PostgreSQL (`pg_trgm`)**.

## Key Implemented Capabilities

1. **Homepage & Brand Fidelity (Sections 1, 1A, 1B)**:
   - Full-viewport hero backed by `/public/images/hero-bg.jpg` with WCAG AA navy overlays, two-line headline (*Medical Revision / Questions Bank*), predictive search bar directly below the frozen header with an accessible **Clear (X)** button, eyebrow rule, sub-text (zero fake counts), CTA, 3-column feature row, and bottom-right *"Study Smart. Score Higher."* signature.
   - Frozen sticky header across desktop, tablet, and mobile with dynamic database-driven **Subjects** dropdown/accordion, **Log In** (never *Sign In*), and **Study Tools** removed.
2. **Authentication & Security (Section 2)**:
   - Student registration (`fullName`, `username`, `email`, 8+ char `password`) with email verification and rate-limited login.
   - Separate `/admin/login` requiring admin email, username, password, and optional TOTP 2FA. Session-only cookie (no `Max-Age`/`Expires`), single active session per account, 10-minute idle timeout, and 60-minute absolute lifetime.
3. **Question Bank & Server-Validated MCQs (Section 3)**:
   - Dynamic taxonomy (`Discipline -> Subdiscipline -> Topic -> Category -> Question`).
   - **SAQ & Essay**: Display section and total marks only—no model answers or marking schemes stored.
   - **MCQ Answered vs Unanswered**: Answer keys are never sent to the browser before submission. Correct choice turns green with a slide-in explanation panel; wrong choice turns red with shake animation and retry/reveal options; Unanswered MCQs show a neutral ungraded notice.
4. **Precision Multi-LLM Assistant (Section 5)**:
   - Provider-agnostic adapter supporting **Google Gemini (default), OpenAI, Anthropic Claude, and OpenAI-compatible endpoints** with automatic fallback, temperature `0.1`, mark-sized structured templates, disclaimers, and inaccurate-reply reporting.
5. **Distinct Admin Portal, Preview Mode & Publish Tokens (Sections 7, 7A, 7B, 7C)**:
   - Near-black charcoal UI with continuous neon green-to-red viewport borders and red/green banners.
   - **Preview Mode (`/admin/preview`)**: Locked, read-only sandbox rendering live or draft views across desktop/tablet/mobile while blocking all mutations (`403`) until **Exit Preview** is confirmed.
   - **Publish Confirmation**: Short-lived (2-minute) one-time server tokens bound to exact question IDs, requiring typed `PUBLISH` confirmation for bulk operations.
6. **Spreadsheet Import, Feedback, Double Opt-In Subscribe & Analytics (Sections 6, 7, 8, 9)**:
   - Formula-injection-safe spreadsheet import landing strictly as `DRAFT`.
   - Question-linked feedback inbox, double opt-in email subscriptions with one-click unsubscribe, and student/admin analytics dashboards.

## Local Setup & Deployment

1. **Place Hero Image**: Copy your clean `hero-bg.jpg` (2048x1144) to `public/images/hero-bg.jpg`.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Set DATABASE_URL, JWT_SECRET, ADMIN_JWT_SECRET, GEMINI_API_KEY, and SMTP credentials
   ```
4. **Run Database Migrations & Seed First Admin**:
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```
   *(The seed script creates ONLY the initial Super Admin account and minimal system settings—zero invented questions are preloaded.)*
5. **Start Development / Production Server**:
   ```bash
   npm run dev
   # Production: npm run build && npm start
   ```
6. **Run Automated Link & Responsive Layout Checks**:
   ```bash
   npx playwright install chromium
   npm run test:links
   ```
