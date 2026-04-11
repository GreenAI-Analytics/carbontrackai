# CarbonTrackAI Web Frontend

Next.js-based PWA for EU SME carbon accounting.

## Quick Start

```bash
# Install dependencies
npm install -w @carbontrackai/web

# Start development server
npm run dev -w @carbontrackai/web

# Open http://localhost:3000
```

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React (with planned TanStack Query)
- **PWA**: Service worker setup (in progress)

## Project Structure

```
app/               # Next.js app directory
├── page.tsx       # Home page (landing)
├── layout.tsx     # Root layout
└── globals.css    # Global styles

components/       # Reusable React components
├── Header.tsx     # Navigation header
├── Hero.tsx       # Hero section
├── Modules.tsx    # Feature modules (1-5)
├── WhyChoose.tsx  # Value proposition
├── CTA.tsx        # Call-to-action
└── Footer.tsx     # Footer

public/           # Static assets (logos, favicons)
```

## Pages (to be built)

- ✅ Landing page (`/`)
- 🚧 User authentication (`/login`, `/signup`)
- 🚧 Dashboard (`/dashboard`)
- 🚧 Emissions calculator
- 🚧 Report generation
- 🚧 Offline mode (PWA)

## Building for Production

```bash
npm run build -w @carbontrackai/web
npm start -w @carbontrackai/web
```

## Environment Variables

Create `.env.local` in `apps/web/`:

```
NEXT_PUBLIC_SUPABASE_URL=https://qkpxtlfoidvgpyrocqej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
