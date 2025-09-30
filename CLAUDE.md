# Deconstructor Project Context

## Project Overview

Deconstructor is a Next.js web application that uses AI to break down words into their etymological components and visualize them as an interactive graph using React Flow.

## Tech Stack & Dependencies

- **Framework**: Next.js 15.1.6 (App Router)
- **Runtime**: Uses Bun for package management and scripts (`bun install`, `bun dev`, `bun run`)
- **Language**: TypeScript
- **UI Libraries**:
  - React 19
  - React Flow (@xyflow/react) - for graph visualization
  - Tailwind CSS - styling
  - shadcn/ui - UI components
- **AI/LLM**:
  - AI SDK (Vercel)
  - Multiple providers: OpenAI, Anthropic, Google Gemini, OpenRouter
  - Uses structured output with Zod schemas
- **State Management**: Jotai
- **Backend**: Supabase (SSR integration)
- **Forms**: React Hook Form with Zod validation
- **Analytics**: Plausible

## Project Structure

```
/app                   # Next.js App Router pages
  /api/route.ts        # Main API endpoint for word deconstruction
  /w/[word]/page.tsx   # Dynamic word pages
  layout.tsx           # Root layout
  page.tsx             # Homepage
  sitemap.ts           # Dynamic sitemap generation
/components            # React components
  deconstructor.tsx    # Main visualization component
  email-dialog.tsx     # Email collection dialog
  /ui                  # shadcn/ui components
/utils                 # Utility functions
  schema.ts            # Zod schemas for word structure
  /supabase            # Supabase client & types
  static-data.ts       # Static content
  text-width.ts        # Text measurement utilities
  use-local-storage.ts # Local storage hook
/scripts               # Build scripts
  generate-top-words.ts # Pre-generates common words
/supabase              # Supabase configuration
```

## Key Features & Workflows

### Word Deconstruction Process

1. User enters a word
2. API endpoint (`/app/api/route.ts`) uses AI SDK with structured output (Zod schema)
3. AI breaks down word into:
   - **Parts**: Individual morphemes with origin/meaning
   - **Combinations**: Progressive layers showing how parts combine
4. Response validated to ensure parts combine correctly to form original word
5. Frontend visualizes as React Flow graph with custom nodes

### Data Schema

```typescript
wordSchema = {
  thought: string,
  parts: [{
    id: string,
    text: string,
    originalWord: string,
    origin: string,
    meaning: string
  }],
  combinations: [[{  // Array of layers
    id: string,
    text: string,
    definition: string,
    sourceIds: string[]
  }]]
}
```

### Caching & Performance

- Word pages (`/w/[word]`) use ISR with 1-hour cache
- Static generation for top 1000 common words
- Results cached in Supabase
- Custom build IDs with timestamps

## Development Commands

```bash
bun dev              # Start dev server
bun run build        # Production build
bun run lint         # ESLint
bun run generate-words  # Pre-generate top words
```

## Environment Variables

Required in `.env.local`:

- `OPENROUTER_API_KEY` - OpenRouter API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini API key
- Supabase credentials (for caching)

## Code Style & Conventions

- TypeScript strict mode
- Functional components with hooks
- Server components by default, "use client" when needed
- Tailwind for styling (no CSS modules)
- Jotai atoms for shared state
- Zod for runtime validation
- Server-only imports wrapped with "server-only" package

## Key Files to Know

- `components/deconstructor.tsx` - Main interactive component
- `app/api/route.ts` - AI word processing logic
- `utils/schema.ts` - Core data structure
- `utils/supabase/client.ts` - Database client setup
- `next.config.ts` - Headers, caching, security config

## Important Notes

- Always use Bun commands, not npm
- API route has 60s max duration for complex words
- Validation ensures word parts actually combine to form input word
- React Flow nodes are custom components (WordChunkNode, OriginNode, etc.)
- Email collection is non-blocking with local storage persistence
