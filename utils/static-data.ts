import 'server-only';
import { supabase } from "@/utils/supabase/client";
import { wordSchema } from "@/utils/schema";
import { z } from "zod";

export type WordData = z.infer<typeof wordSchema>;

export interface CachedWord {
  word: string;
  graph: WordData;
  created_at: string;
  updated_at: string;
  requests: number;
}

/**
 * Fetch all cached words from the database for static generation
 */
export async function getAllCachedWords(): Promise<CachedWord[]> {
  try {
    const { data, error } = await supabase
      .from("deconstructions")
      .select("word, graph, created_at, updated_at, requests")
      .order("requests", { ascending: false }); // Order by popularity

    if (error) {
      console.error("Error fetching cached words:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Validate and transform the data
    const validWords: CachedWord[] = [];
    for (const item of data) {
      try {
        // Validate the graph data matches our schema
        const validatedGraph = wordSchema.parse(item.graph);
        validWords.push({
          word: item.word,
          graph: validatedGraph,
          created_at: item.created_at,
          updated_at: item.updated_at,
          requests: item.requests || 0,
        });
      } catch (validationError) {
        console.warn(`Invalid graph data for word "${item.word}":`, validationError);
        // Skip invalid entries but continue processing others
      }
    }

    return validWords;
  } catch (error) {
    console.error("Failed to fetch cached words:", error);
    return [];
  }
}

/**
 * Fetch a specific word's data from the database
 */
export async function getCachedWordData(word: string): Promise<CachedWord | null> {
  try {
    const cleanedWord = word.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from("deconstructions")
      .select("word, graph, created_at, updated_at, requests")
      .eq("word", cleanedWord)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching word "${word}":`, error);
      return null;
    }

    if (!data) {
      return null;
    }

    try {
      // Validate the graph data
      const validatedGraph = wordSchema.parse(data.graph);
      return {
        word: data.word,
        graph: validatedGraph,
        created_at: data.created_at,
        updated_at: data.updated_at,
        requests: data.requests || 0,
      };
    } catch (validationError) {
      console.warn(`Invalid graph data for word "${word}":`, validationError);
      return null;
    }
  } catch (error) {
    console.error(`Failed to fetch word "${word}":`, error);
    return null;
  }
}

/**
 * Get static paths for all cached words
 */
export async function getStaticWordPaths(): Promise<{ word: string }[]> {
  const cachedWords = await getAllCachedWords();
  return cachedWords.map(item => ({
    word: item.word
  }));
}

/**
 * Generate metadata for a specific word
 */
export function generateWordMetadata(wordData: CachedWord) {
  const { word, graph } = wordData;
  
  // Extract meaningful description from the word parts
  const partsDescription = graph.parts
    .map(part => `${part.text} (${part.meaning})`)
    .join(", ");
  
  const finalDefinition = graph.combinations.length > 0 
    ? graph.combinations[graph.combinations.length - 1][0]?.definition 
    : `Word parts: ${partsDescription}`;

  return {
    title: `${word.charAt(0).toUpperCase() + word.slice(1)} - Etymology & Word Deconstruction`,
    description: `Discover the etymology of "${word}": ${finalDefinition}. Interactive breakdown showing ${graph.parts.length} word parts from origins like ${[...new Set(graph.parts.map(p => p.origin))].join(", ")}.`,
    keywords: [
      word,
      "etymology",
      "word origin",
      "linguistic analysis",
      "word deconstruction",
      ...graph.parts.map(p => p.originalWord),
      ...new Set(graph.parts.map(p => p.origin))
    ].join(", "),
    openGraph: {
      title: `Etymology of "${word}"`,
      description: finalDefinition,
      type: "article",
      publishedTime: wordData.created_at,
      modifiedTime: wordData.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: `Etymology of "${word}"`,
      description: finalDefinition,
    }
  };
}