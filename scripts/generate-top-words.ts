import fs from 'fs';
import path from 'path';

// Function to parse the topwords.txt file
function parseTopWordsFile(): string[] {
  const filePath = path.join(__dirname, '..', 'topwords.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ topwords.txt file not found in root directory');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const words: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Add the word directly since file is already cleaned
    words.push(line);
  }
  
  // Remove duplicates (case-insensitive)
  const uniqueWords: string[] = [];
  const seenWords = new Set<string>();
  
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!seenWords.has(lowerWord)) {
      seenWords.add(lowerWord);
      uniqueWords.push(word);
    }
  }
  
  return uniqueWords;
}

interface GenerationResult {
  success: boolean;
  word: string;
  result?: unknown;
  error?: string;
}

// Function to make API call to generate word deconstruction
async function generateWordDeconstruction(word: string): Promise<GenerationResult> {
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
  
  try {
    console.log(`🔄 Generating deconstruction for: "${word}"`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        word: word,
        // update: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (response.status === 203) {
      console.log(`⚠️  Generated with issues: "${word}"`);
    } else {
      console.log(`✅ Successfully generated: "${word}"`);
    }
    
    return { success: true, word, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to generate "${word}":`, errorMessage);
    return { success: false, word, error: errorMessage };
  }
}

// Function to add delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to check if server is running
async function checkServerHealth(): Promise<boolean> {
  const healthUrl = process.env.API_URL?.replace('/api', '') || 'http://localhost:3000';
  
  try {
    const response = await fetch(healthUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Main function to process all words
async function main(): Promise<void> {
  console.log('🚀 Starting top words generation script...\n');
  
  // Check if server is running
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServerHealth();
  
  if (!serverRunning) {
    console.error('❌ Server is not running! Please start your development server first:');
    console.error('   bun run dev');
    console.error('   # or npm run dev');
    process.exit(1);
  }
  console.log('✅ Server is running\n');
  
  // Parse the words file
  const words = parseTopWordsFile();
  console.log(`📝 Found ${words.length} unique words to process\n`);
  
  if (words.length === 0) {
    console.log('❌ No valid words found to process');
    process.exit(1);
  }
  
  // Show preview of words
  console.log('📋 Preview of words to process:');
  console.log(words.slice(0, 15).map(word => `  • ${word}`).join('\n'));
  if (words.length > 15) {
    console.log(`  ... and ${words.length - 15} more\n`);
  } else {
    console.log('');
  }
  
  // Ask for confirmation
  console.log('⚠️  This will generate deconstructions for all words and may take a while.');
  console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await delay(5000);
  
  // Process words with rate limiting
  const results: GenerationResult[] = [];
  const batchSize = 3; // Process 3 words at a time to be gentler on the API
  const delayBetweenBatches = 1000; // 3 seconds between batches
  const delayBetweenWords = 1000; // 1 second between individual words
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(words.length / batchSize);
    
    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}:`);
    
    // Process batch with individual delays
    for (const word of batch) {
      const result = await generateWordDeconstruction(word);
      results.push(result);
      
      // Small delay between words in the same batch
      if (word !== batch[batch.length - 1]) {
        await delay(delayBetweenWords);
      }
    }
    
    // Longer delay between batches
    if (i + batchSize < words.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches / 1000}s before next batch...`);
      await delay(delayBetweenBatches);
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 Generation Summary:');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${results.length}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed words:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  • ${r.word}: ${r.error}`));
  }
  
  console.log('\n🎉 Top words generation complete!');
  console.log('💡 You can now run "bun run build" to generate static pages for all words.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Generation stopped by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { parseTopWordsFile, generateWordDeconstruction };