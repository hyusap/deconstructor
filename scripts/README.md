# Top Words Generation Script

This script parses the `topwords.txt` file in the root directory and generates word deconstructions for all valid words using the API.

## Usage

1. **Make sure your development server is running:**
   ```bash
   bun run dev
   ```

2. **Run the generation script:**
   ```bash
   bun run generate-words
   ```

## What it does

- **Parses** `topwords.txt` and extracts unique words
- **Filters** out inappropriate content and statistics lines
- **Checks** if the server is running before starting
- **Generates** word deconstructions using your API
- **Rate limits** requests to avoid overwhelming the AI service
- **Shows progress** and provides detailed output
- **Handles errors** gracefully and continues processing

## Features

- ✅ **Smart parsing** - Handles the mixed format of topwords.txt
- ✅ **Content filtering** - Skips inappropriate or problematic words  
- ✅ **Rate limiting** - Processes 3 words at a time with delays
- ✅ **Error handling** - Continues on failures and reports issues
- ✅ **Progress tracking** - Shows batch progress and success rates
- ✅ **Server health check** - Verifies API is available before starting
- ✅ **Graceful shutdown** - Handles Ctrl+C interruption

## Configuration

You can modify these settings in the script:

- `batchSize` - How many words to process simultaneously (default: 3)
- `delayBetweenBatches` - Milliseconds between batches (default: 3000)
- `delayBetweenWords` - Milliseconds between individual words (default: 1000)
- `skipWords` - Array of words to filter out

## Output

The script will:
1. Show a preview of words to be processed
2. Wait 5 seconds for confirmation (Ctrl+C to cancel)
3. Process words in batches with progress updates
4. Display a final summary with success/failure counts
5. List any failed words with error messages

## Example Output

```
🚀 Starting top words generation script...

✅ Server is running

📝 Found 45 unique words to process

📋 Preview of words to process:
  • φιλανθρωπία
  • etymology
  • antidisestablishmentarianism
  • hello
  • helicopter
  ... and 40 more

📦 Processing batch 1/15:
🔄 Generating deconstruction for: "φιλανθρωπία"
✅ Successfully generated: "φιλανθρωπία"
...

📊 Generation Summary:
✅ Successful: 42
❌ Failed: 3
📝 Total: 45
📈 Success Rate: 93.3%

🎉 Top words generation complete!
```

## After Running

After the script completes successfully:

1. **Build static pages:**
   ```bash
   bun run build
   ```

2. **Check your database** - All words should now be cached in Supabase

3. **Test the site** - Visit word pages to see the generated content

## Troubleshooting

- **"Server is not running"** - Make sure `bun run dev` is running in another terminal
- **API errors** - Check your environment variables and API keys
- **Rate limiting** - The script has built-in delays, but you can increase them if needed
- **Memory issues** - Reduce `batchSize` if you encounter problems