import WordDeconstructor from "@/components/deconstructor";
import { supabase } from "@/utils/supabase/client";

export async function generateStaticParams() {
  const { data, error } = await supabase.from("deconstructions").select();

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((deconstruction) => ({
    word: deconstruction.word,
  }));
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

  return <WordDeconstructor word={decodedWord} />;
}
