import { generateObject } from "ai";
import { wordSchema } from "@/utils/schema";
import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { z } from "zod";

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

interface LastAttempt {
  errors: string[];
  output: WordOutput;
}

// Define the type for the params object
interface Params {
  params: {
    word: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { word } = params;

    console.log(word);

    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "Word is required and must be a string" },
        { status: 400 }
      );
    }

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

      const result = await generateObject({
        model: google("gemini-2.0-pro-exp-02-05"),
        system: `You are a linguistic expert that deconstructs words into their meaningful parts and explains their etymology. Create multiple layers of combinations to form the final meaning of the word.

Schema Requirements:
- thought: Think about the word/phrase, it's origins, and how it's put together. Eg. if it's a name, think about where the name comes from, etc.
- parts: An array of word parts that MUST combine to form the original word and be in the same order
  - id: Lowercase identifier for the word part, no spaces. Must be unique. If the word has the same part multiple times, give each one a different id. Cannot repeat ids from the combinations.
  - text: The actual text segment of the word part
  - originalWord: The original word or affix this part comes from
  - origin: Brief origin like "Latin", "Greek", "Old English"
  - meaning: Concise meaning of this word part
- combinations: A Directed Acyclic Graph (DAG) that forms the original word
  - Each array represents a single layer of the DAG. If possible, keep the combinations in order of how they're used in the word within each layer.
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

      if (errors.length > 0) {
        console.log("validation errors:", errors);
        attempts.push({
          errors,
          output: result.object,
        });
        continue;
      }

      // Simplify the DAG before returning
      return NextResponse.json(result.object);
    }

    // Return the last attempt anyway
    return NextResponse.json(attempts[attempts.length - 1]?.output, {
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
