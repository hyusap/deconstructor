import { getAllCachedWords } from "@/utils/static-data";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://deconstructor.vercel.app";
  
  // Get all cached words
  const cachedWords = await getAllCachedWords();
  
  // Create sitemap entries for each word
  const wordEntries: MetadataRoute.Sitemap = cachedWords.map((wordData) => ({
    url: `${baseUrl}/w/${encodeURIComponent(wordData.word).replace(/%20/g, "+")}`,
    lastModified: new Date(wordData.updated_at),
    changeFrequency: "monthly" as const,
    priority: Math.min(0.5 + (wordData.requests * 0.01), 1.0), // Higher priority for more popular words
  }));

  // Add static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
  ];

  return [...staticPages, ...wordEntries];
}