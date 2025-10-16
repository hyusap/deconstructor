# Word Deconstructor

A beautiful and interactive web application that deconstructs words into their meaningful parts and explains their etymology. Built with Next.js, React Flow, and powered by AI.

## Features

- 🔍 Interactive word analysis
- 🌳 Beautiful visualization of word components using React Flow
- 📚 Detailed etymology and meaning breakdowns
- 🎨 Dark mode
- ⚡ Real-time updates and animations
- 🧠 AI-powered word deconstruction using Claude Sonnet 4.5

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- An Anthropic API key (get one at [Anthropic Console](https://console.anthropic.com/))

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/hyusap/deconstructor.git
cd deconstructor
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp example.env .env.local
```

Then edit `.env.local` and add your API key:
```env
# Get your Anthropic API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```


4. Run the development server:

```bash
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Switching AI Models

The project currently uses **Anthropic's Claude Sonnet 4.5** as the default model, but supports any provider through the Vercel AI SDK. To switch models:

1. Open `app/api/route.ts`
2. Find line 266 where the model is configured
3. Comment out the current model and uncomment your preferred option:

```typescript
// Option 1: Anthropic Claude (current default)
model: anthropic("claude-sonnet-4-5-20250929"),

// Option 2: OpenAI (requires OPENAI_API_KEY)
// model: openai("gpt-4o"),
// model: openai("gpt-4o-mini"),
```

4. Add the corresponding API key to your `.env.local` file

For other providers (Google Gemini, Mistral, etc.), see the [Vercel AI SDK Providers documentation](https://ai-sdk.dev/docs/foundations/providers-and-models)

## How It Works

The Word Deconstructor breaks down words into their constituent parts:

1. Enter any word in the input field
2. The AI analyzes the word's etymology and components
3. A beautiful graph visualization shows:
   - Individual word parts
   - Their origins (Latin, Greek, etc.)
   - Meanings of each component
   - How components combine to form the full word

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [React Flow](https://reactflow.dev/) - Graph visualization
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Anthropic Claude](https://www.anthropic.com/) - AI-powered word analysis
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Jotai](https://jotai.org/) - State management

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
