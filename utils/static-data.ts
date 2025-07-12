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

  const origins = [...new Set(graph.parts.map(p => p.origin))];
  const rootWords = graph.parts.map(p => p.originalWord);
  
  // Create more detailed description
  const detailedDescription = `Explore the etymology of "${word}" - ${finalDefinition}. This word consists of ${graph.parts.length} parts from ${origins.join(" and ")} origins: ${graph.parts.map(p => `"${p.text}" (${p.originalWord}: ${p.meaning})`).join(", ")}. Interactive linguistic analysis with visual word breakdown.`;

  return {
    title: `${word.charAt(0).toUpperCase() + word.slice(1)} Etymology: Origins & Meaning | Word Deconstructor`,
    description: detailedDescription.length > 160 
      ? `Discover the etymology of "${word}": ${finalDefinition}. Interactive breakdown showing ${graph.parts.length} word parts from ${origins.join(", ")} origins.`
      : detailedDescription,
    keywords: [
      word,
      "etymology",
      "word origin",
      "linguistic analysis",
      "word deconstruction",
      "word meaning",
      "language roots",
      ...rootWords,
      ...origins.map(o => `${o} etymology`),
      `${word} meaning`,
      `${word} origin`,
      `${word} etymology`
    ].join(", "),
    openGraph: {
      title: `Etymology of "${word}" - Interactive Word Analysis`,
      description: finalDefinition,
      type: "article",
      publishedTime: wordData.created_at,
      modifiedTime: wordData.updated_at,
      siteName: "Word Deconstructor",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `Etymology of "${word}"`,
      description: finalDefinition,
      site: "@deconstructor", // Add your Twitter handle if you have one
    },
    alternates: {
      canonical: `https://deconstructor.vercel.app/w/${encodeURIComponent(word).replace(/%20/g, "+")}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate JSON-LD structured data for a word
 */
export function generateWordStructuredData(wordData: CachedWord) {
  const { word, graph } = wordData;
  
  const finalDefinition = graph.combinations.length > 0 
    ? graph.combinations[graph.combinations.length - 1][0]?.definition 
    : `Word consisting of parts: ${graph.parts.map(p => p.text).join(", ")}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": word,
    "description": finalDefinition,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "Etymology Dictionary",
      "description": "Interactive word etymology and deconstruction database"
    },
    "termCode": word,
    "url": `https://deconstructor.vercel.app/w/${encodeURIComponent(word).replace(/%20/g, "+")}`,
    "dateCreated": wordData.created_at,
    "dateModified": wordData.updated_at,
    "creator": {
      "@type": "Organization",
      "name": "Word Deconstructor",
      "url": "https://deconstructor.vercel.app"
    },
    "mainEntity": {
      "@type": "Article",
      "headline": `Etymology of ${word}`,
      "description": finalDefinition,
      "author": {
        "@type": "Organization",
        "name": "Word Deconstructor AI"
      },
      "datePublished": wordData.created_at,
      "dateModified": wordData.updated_at,
      "articleSection": "Etymology",
      "keywords": [...new Set([
        word,
        "etymology",
        "word origin",
        ...graph.parts.map(p => p.origin),
        ...graph.parts.map(p => p.originalWord)
      ])],
      "about": graph.parts.map(part => ({
        "@type": "DefinedTerm",
        "name": part.originalWord,
        "description": part.meaning,
        "inDefinedTermSet": {
          "@type": "DefinedTermSet",
          "name": `${part.origin} Etymology`
        }
      }))
    }
  };

  return structuredData;
}