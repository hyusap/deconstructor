import WordDeconstructor from "@/components/deconstructor";
import { getStaticWordPaths, getCachedWordData, generateWordMetadata } from "@/utils/static-data";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  try {
    const paths = await getStaticWordPaths();
    return paths;
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ word: string }> 
}): Promise<Metadata> {
  const word = (await params).word;
  
  // Decode URL-encoded and plus-encoded characters
  let decodedWord = word.replace(/%2B/gi, " ");
  decodedWord = decodedWord.replace(/\+/gi, " ");
  decodedWord = decodeURIComponent(decodedWord);
  
  const wordData = await getCachedWordData(decodedWord);
  
  if (!wordData) {
    return {
      title: `${decodedWord.charAt(0).toUpperCase() + decodedWord.slice(1)} - Word Deconstructor`,
      description: `Explore the etymology and linguistic breakdown of "${decodedWord}".`,
    };
  }
  
  return generateWordMetadata(wordData);
}

export default async function WordPage({
  params,
}: {
  params: Promise<{ word: string }>;
}) {
  const word = (await params).word;

  if (!word) {
    return <div>No word provided</div>;
  }

  // Decode URL-encoded and plus-encoded characters
  let decodedWord = word.replace(/%2B/gi, " ");
  decodedWord = decodedWord.replace(/\+/gi, " ");
  decodedWord = decodeURIComponent(decodedWord);
  console.log("decodedWord", decodedWord);

  // Fetch static data for this word
  const staticWordData = await getCachedWordData(decodedWord);
  
  // If we have static data but the word doesn't exist, show 404
  if (word !== decodedWord && !staticWordData) {
    notFound();
  }

  return (
    <WordDeconstructor 
      word={decodedWord} 
      staticData={staticWordData?.graph}
    />
  );
}
