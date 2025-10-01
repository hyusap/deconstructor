import { generateObject } from "ai";
// import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { wordSchema } from "@/utils/schema";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { supabase } from "@/utils/supabase/client";
// const openrouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY,
// });

// Define the schema for word parts and combinations

type WordOutput = z.infer<typeof wordSchema>;

export const maxDuration = 60;

function validateWordParts(word: string, parts: WordOutput["parts"]): string[] {
  const errors: string[] = [];
  const combinedParts = parts.map((p) => p.text).join("");
  const commaSeparatedParts = parts.map((p) => p.text).join(", ");

  if (combinedParts.toLowerCase() !== word.toLowerCase().replaceAll(" ", "")) {
    errors.push(
      `The parts "${commaSeparatedParts}" do not combine to form the word "${word}"`
    );
  }
  return errors;
}

function validateUniqueIds(output: WordOutput): string[] {
  const errors: string[] = [];
  const seenIds = new Map<string, string>(); // id -> where it was found

  // Check parts
  output.parts.forEach((part) => {
    seenIds.set(part.id, "parts");
  });

  // Check combinations
  output.combinations.forEach((layer, layerIndex) => {
    layer.forEach((combo) => {
      if (seenIds.has(combo.id)) {
        errors.push(
          `ID "${combo.id}" in combinations layer ${
            layerIndex + 1
          } is already used in ${seenIds.get(
            combo.id
          )}. IDs must be unique across both parts and combinations.`
        );
      }
      seenIds.set(combo.id, `combinations layer ${layerIndex + 1}`);
    });
  });

  return errors;
}

function validateCombinations(word: string, output: WordOutput): string[] {
  const errors: string[] = [];

  // Check if last layer has exactly one item
  const lastLayer = output.combinations[output.combinations.length - 1];
  if (lastLayer.length !== 1) {
    errors.push(
      `The last layer should have exactly one item, which should be the original word, but you have ${lastLayer.length} items. You may need to add one more layer and move the final word to the next layer.`
    );
  }

  // Check if last combination is the full word
  if (lastLayer?.length === 1) {
    const finalWord = lastLayer[0].text.toLowerCase();
    if (finalWord !== word.toLowerCase()) {
      errors.push(
        `The final combination "${finalWord}" does not match the input word "${word}"`
      );
    }
  }

  // Build a map of how many times each ID is used as a source
  const childCount = new Map<string, number>();

  // Initialize counts for all parts
  output.parts.forEach((part) => {
    childCount.set(part.id, 0);
  });

  // Count how many times each ID is used as a source
  output.combinations.forEach((layer) => {
    layer.forEach((combo) => {
      combo.sourceIds.forEach((sourceId) => {
        const count = childCount.get(sourceId) ?? 0;
        childCount.set(sourceId, count + 1);
      });
      // Initialize count for this combination
      childCount.set(combo.id, 0);
    });
  });

  // Check that each node (except the final word) has exactly one child
  for (const [id, count] of childCount.entries()) {
    // Skip the final word as it shouldn't have any children
    if (lastLayer?.length === 1 && id === lastLayer[0].id) continue;

    if (count === 0) {
      errors.push(
        `The node "${id}" is not used as a source for any combinations. Make sure to use it as a source in a future layer.`
      );
    } else if (count > 1) {
      errors.push(
        `The node "${id}" is used ${count} times as a source, but should only be used once. Remove extra uses.`
      );
    }
  }

  // Validate DAG structure
  const allIds = new Set(output.parts.map((p) => p.id));
  for (let i = 0; i < output.combinations.length; i++) {
    const layer = output.combinations[i];
    // Add combination IDs from this layer
    layer.forEach((combo) => allIds.add(combo.id));

    // Check if all sourceIds exist in previous layers
    for (const combo of layer) {
      for (const sourceId of combo.sourceIds) {
        if (!allIds.has(sourceId)) {
          errors.push(
            `The sourceId "${sourceId}" in combination "${combo.id}" does not exist in previous layers.`
          );
        }
      }
    }
  }

  return errors;
}

function simplifyDAG(output: WordOutput): WordOutput {
  // Create a map of all nodes (parts and combinations) and their dependencies
  const nodeMap = new Map<string, Set<string>>();

  // Initialize with parts
  output.parts.forEach((part) => {
    nodeMap.set(part.id, new Set());
  });

  // Add combinations and their dependencies
  output.combinations.forEach((layer) => {
    layer.forEach((combo) => {
      nodeMap.set(combo.id, new Set(combo.sourceIds));
    });
  });

  // Function to get all dependencies recursively
  function getAllDependencies(
    id: string,
    visited = new Set<string>()
  ): Set<string> {
    if (visited.has(id)) return new Set();
    visited.add(id);

    const deps = nodeMap.get(id) || new Set();
    const allDeps = new Set(deps);

    for (const dep of deps) {
      const subDeps = getAllDependencies(dep, visited);
      subDeps.forEach((d) => allDeps.add(d));
    }

    return allDeps;
  }

  // Create new optimized layers
  type Combination = {
    id: string;
    text: string;
    definition: string;
    sourceIds: string[];
  };
  type Layer = [Combination, ...Combination[]];
  const newCombinations: Layer[] = [];
  const processed = new Set<string>();
  const partsSet = new Set(output.parts.map((p) => p.id));

  // Start with combinations that only depend on parts
  let currentLayer = output.combinations
    .flat()
    .filter((combo) => combo.sourceIds.every((id) => partsSet.has(id)));

  while (currentLayer.length > 0) {
    // Ensure each layer has at least one combination
    if (currentLayer.length > 0) {
      newCombinations.push([currentLayer[0], ...currentLayer.slice(1)]);
    }
    currentLayer.forEach((combo) => processed.add(combo.id));

    // Find next layer: combinations whose dependencies are all processed
    currentLayer = output.combinations.flat().filter(
      (combo) =>
        !processed.has(combo.id) && // Not already processed
        combo.sourceIds.every((id) => partsSet.has(id) || processed.has(id))
    );
  }

  // If we have no combinations, add an empty layer to satisfy the type
  if (newCombinations.length === 0 && output.combinations.length > 0) {
    const emptyCombination = output.combinations[0][0];
    newCombinations.push([emptyCombination]);
  }

  return {
    ...output,
    combinations: newCombinations as typeof output.combinations,
  };
}

interface LastAttempt {
  errors: string[];
  output: WordOutput;
}

async function deconstructWord(word: string) {
  const attempts: LastAttempt[] = [];
  const maxAttempts = 3;

  while (attempts.length < maxAttempts) {
    const prompt: string =
      attempts.length === 0
        ? `Deconstruct the word: ${word}`
        : `Deconstruct the word: ${word}

Previous attempts:
${attempts
.map(
  (attempt, index) => `
Attempt ${index + 1}:
${JSON.stringify(attempt.output, null, 2)}
Errors:
${attempt.errors.map((error) => `- ${error}`).join("\n")}
`
)
.join("\n")}

Please fix all the issues and try again.`;

    console.log("prompt", prompt);
    console.log("word", word);
    console.log("attempts", attempts);

    let model: string;
    switch (attempts.length) {
      case 0:
        model = "gpt-4o-mini";
        break;
      default:
        model = "gpt-4o";
        break;
    }

    const result = await generateObject({
      // model: openai(model),
      // model: google("gemini-2.0-pro-exp-02-05"),
      // model: google("gemini-2.5-flash"),
      model: anthropic("claude-sonnet-4-5-20250929"), 
      system: `You are a linguistic expert that deconstructs words into their meaningful parts and explains their etymology. Create multiple layers of combinations to form the final meaning of the word.

Schema Requirements:
- thought: Think about the word/phrase, it's origins, and how it's put together. Eg. if it's a name, think about where the name comes from, etc.
- parts: An array of word parts. The text sections of the parts MUST combine to form the original word, nothing more, nothing less.
- id: Lowercase identifier for the word part, no spaces. Must be unique. If the word has the same part multiple times, give each one a different id. Cannot repeat ids from the combinations.
- text: The EXACT section of the input word that this input part should be attached to. Be careful not to refernce the same letter multiple times across multiple parts.
- originalWord: The original word or affix this part comes from. Use the ABSOLUTE oldest word or affix that this part comes from.
- origin: Brief origin like "Latin", "Greek", "Old English"
- meaning: Concise meaning of this word part
- combinations: A Directed Acyclic Graph (DAG) that forms the original word
- Each array represents a single layer of the DAG. If possible, keep the combinations in order of how they're used in the word within each layer. Try to use many useful intermediate combinations. If a word's origin isn't modern english, conver it to english as a combination, then use that combination as a source for the next layer.
- Each combination contains:
  - id: Lowercase identifier for the combination. Must be unique. If the word has the same combination multiple times, give each one a different id. Cannot repeat ids from the parts.
  - text: The combined text segments
  - definition: Clear definition of the combined parts
  - sourceIds: Array of ids of the parts or combinations that form this
- The last layer MUST only have one combination, which MUST be the original word

Here's an example for the word "deconstructor":
{
"thought": "..."
"parts": [
  {
    "id": "de",
    "text": "de",
    "originalWord": "de-",
    "origin": "Latin",
    "meaning": "down, off, away"
  },
  {
    "id": "construc",
    "text": "construc",
    "originalWord": "construere",
    "origin": "Latin",
    "meaning": "to build, to pile up"
  },
  {
    "id": "tor",
    "text": "tor",
    "originalWord": "-or",
    "origin": "Latin",
    "meaning": "agent noun, one who does an action"
  }
],
"combinations": [
  [
    {
      "id": "constructor",
      "text": "constructor",
      "definition": "one who constructs or builds",
      "sourceIds": ["construc", "tor"]
    }
  ],
  [
    {
      "id": "deconstructor",
      "text": "deconstructor",
      "definition": "one who takes apart or analyzes the construction of something",
      "sourceIds": ["de", "constructor"]
    }
  ]
]
}`,
      prompt,
      schema: wordSchema,
    });

    const errors: string[] = [
      ...validateWordParts(word, result.object.parts),
      ...validateUniqueIds(result.object),
      ...validateCombinations(word, result.object),
    ];

    attempts.push({
      errors,
      output: result.object,
    });

    if (errors.length > 0) {
      console.log("validation errors:", errors);
      continue;
    } else {
      break;
    }
  }

  return attempts[attempts.length - 1];
}

export async function POST(req: Request) {
  console.log("POST request received");
  try {
    const { word, update = false } = await req.json();

    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "Word is required and must be a string" },
        { status: 400 }
      );
    }

    const cleanedWord = word.toLowerCase().trim();

    const { data: existingGraph, error: existingGraphError } = await supabase.from("deconstructions").select("*").eq("word", cleanedWord).maybeSingle();

    if (existingGraphError) {
      console.error("Error fetching existing graph:", existingGraphError);
    }

    let attempt: LastAttempt;

    if (update || !existingGraph) {
      attempt = await deconstructWord(word);

      // Save new generation to Supabase
      const { data, error } = await supabase.from("deconstructions").upsert({
        id: existingGraph?.id,
        word: cleanedWord,
        graph: attempt.output,
        requests: 1,
      });

      if (error) {
        console.error("Error saving to database:", error);
      }
    } else {
      attempt = {
        errors: [],
        output: existingGraph.graph,
      };
    }

    if (attempt.errors.length === 0) {
      return NextResponse.json(attempt.output);
    }

    // Return the last attempt anyway
    return NextResponse.json(attempt.output, {
      status: 203,
    });
    } catch (error) { 
    console.error("Error generating word deconstruction:", error);
    return NextResponse.json(
      { error: "Failed to generate word deconstruction" },
      { status: 500 }
    );
  }
}
