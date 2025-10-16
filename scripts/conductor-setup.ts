#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

console.log("🚀 Setting up Deconstructor workspace...");

// Install dependencies
console.log("📦 Installing dependencies with Bun...");
await $`bun install`;

// Get root path from environment
const rootPath = process.env.CONDUCTOR_ROOT_PATH;
if (!rootPath) {
  console.error("❌ Error: CONDUCTOR_ROOT_PATH environment variable not set");
  process.exit(1);
}

// Copy .env from root if it exists
const envLocalRoot = join(rootPath, ".env.local");
const envRoot = join(rootPath, ".env");
const envLocalTarget = ".env.local";

if (existsSync(envLocalRoot)) {
  console.log("🔐 Copying .env.local from root repository...");
  await $`cp ${envLocalRoot} ${envLocalTarget}`;
} else if (existsSync(envRoot)) {
  console.log("🔐 Copying .env from root repository...");
  await $`cp ${envRoot} ${envLocalTarget}`;
} else {
  console.log("⚠️  Warning: No .env or .env.local found in root. Creating from example...");
  await $`cp example.env ${envLocalTarget}`;
  console.log("");
  console.error("❌ ERROR: Please configure the following required environment variables in .env.local:");
  console.error("  - OPENROUTER_API_KEY");
  console.error("  - GOOGLE_GENERATIVE_AI_API_KEY");
  console.error("");
  console.error("You can find the template in example.env");
  process.exit(1);
}

// Validate required environment variables
const envContent = readFileSync(envLocalTarget, "utf-8");
const hasOpenRouter = envContent.includes("OPENROUTER_API_KEY=") &&
                      !envContent.match(/OPENROUTER_API_KEY=\s*$/m) &&
                      !envContent.includes("OPENROUTER_API_KEY=your-api-key-here");
const hasGoogleAI = envContent.includes("GOOGLE_GENERATIVE_AI_API_KEY=") &&
                    !envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=\s*$/m) &&
                    !envContent.includes("GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here");

if (!hasOpenRouter || !hasGoogleAI) {
  console.log("");
  console.error("❌ ERROR: Missing required environment variables in .env.local:");
  if (!hasOpenRouter) console.error("  - OPENROUTER_API_KEY");
  if (!hasGoogleAI) console.error("  - GOOGLE_GENERATIVE_AI_API_KEY");
  console.log("");
  process.exit(1);
}

console.log("✅ Workspace setup complete!");
console.log("🎯 Run 'bun dev' to start the development server");
