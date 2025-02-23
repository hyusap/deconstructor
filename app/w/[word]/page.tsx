import WordDeconstructor from "@/components/deconstructor";

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
